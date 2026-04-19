package com.egetify.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

/**
 * Extracts audio stream URLs via yt-dlp routed through residential proxies.
 * Runs on a dedicated 2-thread pool so yt-dlp never blocks Tomcat's request threads.
 * Deduplicates concurrent requests for the same videoId (one yt-dlp call shared).
 */
@Slf4j
@Service
public class InvidiousService {

    private static final String PROXY_USER = "ownydbfo";
    private static final String PROXY_PASS = "w6k0edt4fzfi";

    private static final List<String> PROXIES = List.of(
            "31.58.9.4:6077",
            "31.59.20.176:6754",
            "198.23.239.134:6540"
    );

    private static final long CACHE_TTL_MS = 4 * 60 * 60 * 1000L;

    private record CacheEntry(String url, long expiresAt) {}
    private final Map<String, CacheEntry> cache = new ConcurrentHashMap<>();

    /** In-flight requests: videoId → future being resolved by yt-dlp */
    private final Map<String, CompletableFuture<String>> inFlight = new ConcurrentHashMap<>();

    /** Max 2 concurrent yt-dlp processes so EC2 doesn't run out of memory/CPU */
    private final ExecutorService ytdlpExecutor = Executors.newFixedThreadPool(2);

    /** Returns a future that completes with the stream URL — never blocks the caller's thread. */
    public CompletableFuture<String> getAudioStreamUrl(String videoId) {
        CacheEntry cached = cache.get(videoId);
        if (cached != null && System.currentTimeMillis() < cached.expiresAt()) {
            log.debug("Cache hit for videoId: {}", videoId);
            return CompletableFuture.completedFuture(cached.url());
        }

        CompletableFuture<String> existing = inFlight.get(videoId);
        if (existing != null) {
            log.debug("Joining in-flight extraction for videoId: {}", videoId);
            return existing;
        }

        CompletableFuture<String> future = new CompletableFuture<>();
        CompletableFuture<String> previous = inFlight.putIfAbsent(videoId, future);
        if (previous != null) return previous;

        ytdlpExecutor.submit(() -> {
            try {
                String url = extractWithProxies(videoId);
                cache.put(videoId, new CacheEntry(url, System.currentTimeMillis() + CACHE_TTL_MS));
                future.complete(url);
            } catch (Exception e) {
                future.completeExceptionally(e);
            } finally {
                inFlight.remove(videoId);
            }
        });

        return future;
    }

    private String extractWithProxies(String videoId) throws Exception {
        log.info("Extracting stream URL for videoId: {}", videoId);
        Exception last = null;
        for (String proxy : PROXIES) {
            try {
                String url = extractWithProxy(videoId, proxy);
                if (url != null && !url.isBlank()) {
                    log.info("Stream URL extracted via {} for videoId: {}", proxy, videoId);
                    return url;
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
                "-f", "bestaudio[ext=m4a]/bestaudio[acodec=aac]/bestaudio/best",
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
