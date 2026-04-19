package com.egetify.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.*;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

/**
 * Extracts audio stream URLs via yt-dlp routed through residential proxies.
 * The CDN URL is IP-locked to the proxy that fetched it, so streaming also
 * routes through the same proxy.
 */
@Slf4j
@Service
public class InvidiousService {

    private static final String PROXY_USER = "ownydbfo";
    private static final String PROXY_PASS = "w6k0edt4fzfi";

    private static final List<String> PROXIES = List.of(
            "31.59.20.176:6754",   // GB, London
            "198.23.239.134:6540", // US, Buffalo
            "45.38.107.97:6014",   // GB, London
            "107.172.163.27:6543", // US, Bloomingdale
            "216.10.27.159:6837"   // US, Dallas
    );

    private static final long CACHE_TTL_MS = 90 * 60 * 1000L;

    /** Stores both the CDN url and which proxy fetched it (needed to stream through same proxy) */
    private record CacheEntry(String url, String proxy, long expiresAt) {}
    private final Map<String, CacheEntry> cache = new ConcurrentHashMap<>();

    private final Map<String, CompletableFuture<CacheEntry>> inFlight = new ConcurrentHashMap<>();
    private final ExecutorService ytdlpExecutor = Executors.newFixedThreadPool(2);

    public CompletableFuture<String> getAudioStreamUrl(String videoId) {
        CacheEntry cached = cache.get(videoId);
        if (cached != null && System.currentTimeMillis() < cached.expiresAt()) {
            log.debug("Cache hit for videoId: {}", videoId);
            return CompletableFuture.completedFuture(cached.url());
        }
        return resolveEntry(videoId).thenApply(CacheEntry::url);
    }

    /** Returns the CDN url + the proxy to use when streaming it. */
    public CompletableFuture<CacheEntry> resolveEntry(String videoId) {
        CacheEntry cached = cache.get(videoId);
        if (cached != null && System.currentTimeMillis() < cached.expiresAt()) {
            return CompletableFuture.completedFuture(cached);
        }

        CompletableFuture<CacheEntry> existing = inFlight.get(videoId);
        if (existing != null) return existing;

        CompletableFuture<CacheEntry> future = new CompletableFuture<>();
        CompletableFuture<CacheEntry> previous = inFlight.putIfAbsent(videoId, future);
        if (previous != null) return previous;

        ytdlpExecutor.submit(() -> {
            try {
                CacheEntry entry = extractWithProxies(videoId);
                cache.put(videoId, entry);
                future.complete(entry);
            } catch (Exception e) {
                future.completeExceptionally(e);
            } finally {
                inFlight.remove(videoId);
            }
        });

        return future;
    }

    /** Opens a connection to the CDN URL routed through the proxy that originally fetched it. */
    public InputStream openStream(String videoId, String rangeHeader) throws Exception {
        CacheEntry entry = resolveEntry(videoId).get(60, TimeUnit.SECONDS);

        String[] parts = entry.proxy().split(":");
        String proxyHost = parts[0];
        int proxyPort = Integer.parseInt(parts[1]);

        Proxy proxy = new Proxy(Proxy.Type.HTTP, new InetSocketAddress(proxyHost, proxyPort));
        HttpURLConnection conn = (HttpURLConnection) new URL(entry.url()).openConnection(proxy);

        Authenticator.setDefault(new Authenticator() {
            @Override
            protected PasswordAuthentication getPasswordAuthentication() {
                return new PasswordAuthentication(PROXY_USER, PROXY_PASS.toCharArray());
            }
        });

        conn.setRequestProperty("User-Agent", "Mozilla/5.0");
        if (rangeHeader != null) conn.setRequestProperty("Range", rangeHeader);
        conn.connect();
        return conn.getInputStream();
    }

    /** Same as openStream but also exposes response headers needed for streaming. */
    public HttpURLConnection openConnection(String videoId, String rangeHeader) throws Exception {
        CacheEntry entry = resolveEntry(videoId).get(60, TimeUnit.SECONDS);

        String[] parts = entry.proxy().split(":");
        String proxyHost = parts[0];
        int proxyPort = Integer.parseInt(parts[1]);

        // Java requires system properties for authenticated HTTPS proxy tunneling
        System.setProperty("https.proxyHost", proxyHost);
        System.setProperty("https.proxyPort", String.valueOf(proxyPort));
        System.setProperty("https.proxyUser", PROXY_USER);
        System.setProperty("https.proxyPassword", PROXY_PASS);
        System.setProperty("jdk.http.auth.tunneling.disabledSchemes", "");

        Authenticator.setDefault(new Authenticator() {
            @Override
            protected PasswordAuthentication getPasswordAuthentication() {
                return new PasswordAuthentication(PROXY_USER, PROXY_PASS.toCharArray());
            }
        });

        HttpURLConnection conn = (HttpURLConnection) new URL(entry.url()).openConnection();
        conn.setRequestProperty("User-Agent", "Mozilla/5.0");
        conn.setRequestProperty("Accept", "*/*");
        if (rangeHeader != null && !rangeHeader.isBlank()) conn.setRequestProperty("Range", rangeHeader);
        conn.connect();
        return conn;
    }

    private CacheEntry extractWithProxies(String videoId) throws Exception {
        log.info("Extracting stream URL for videoId: {}", videoId);
        Exception last = null;
        for (String proxy : PROXIES) {
            try {
                String url = extractWithProxy(videoId, proxy);
                if (url != null && !url.isBlank()) {
                    log.info("Stream URL extracted via {} for videoId: {}", proxy, videoId);
                    return new CacheEntry(url, proxy, System.currentTimeMillis() + CACHE_TTL_MS);
                }
            } catch (Exception e) {
                log.warn("Proxy {} failed for {}: {}", proxy, videoId, e.getMessage());
                last = e;
            }
        }
        throw last != null ? last : new RuntimeException("All proxies failed for videoId: " + videoId);
    }

    private String extractWithProxy(String videoId, String proxyHost) throws Exception {
        String proxyUrl = "http://" + PROXY_USER + ":" + PROXY_PASS + "@" + proxyHost;

        ProcessBuilder pb = new ProcessBuilder(
                "yt-dlp",
                "--no-playlist",
                "--proxy", proxyUrl,
                "--extractor-args", "youtube:player_client=ios",
                "-f", "bestaudio[ext=m4a]/bestaudio[ext=webm]/bestaudio[acodec=aac]/bestaudio/best",
                "--retries", "1",
                "-g",
                "https://www.youtube.com/watch?v=" + videoId
        );
        pb.redirectErrorStream(false);

        Process process = pb.start();

        String url;
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
            url = reader.readLine();
        }

        String stderr;
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getErrorStream()))) {
            stderr = reader.lines()
                    .filter(l -> l != null && !l.isBlank())
                    .reduce("", (a, b) -> a + "\n" + b);
        }

        boolean finished = process.waitFor(15, TimeUnit.SECONDS);
        if (!finished) {
            process.destroyForcibly();
            throw new RuntimeException("yt-dlp timed out for videoId: " + videoId);
        }

        int exitCode = process.exitValue();
        if (exitCode != 0 || url == null || url.isBlank()) {
            throw new RuntimeException(
                    "yt-dlp failed (exit " + exitCode + ") for " + videoId
                    + (stderr.isBlank() ? "" : ": " + stderr.trim()));
        }

        return url.trim();
    }
}
