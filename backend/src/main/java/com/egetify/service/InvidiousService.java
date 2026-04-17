package com.egetify.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;

/**
 * Extracts audio stream URLs via yt-dlp routed through residential proxies.
 * EU/JP proxies listed first for lower latency. Results cached for 4 hours.
 */
@Slf4j
@Service
public class InvidiousService {

    private static final String PROXY_USER = "ownydbfo";
    private static final String PROXY_PASS = "w6k0edt4fzfi";

    private static final List<String> PROXIES = List.of(
            "31.58.9.4:6077",         // DE, Frankfurt
            "31.59.20.176:6754",      // GB, London
            "45.38.107.97:6014",      // GB, London
            "198.105.121.200:6462",   // GB, City of London
            "142.111.67.146:5611",    // JP, Tokyo
            "216.10.27.159:6837",     // US, Dallas
            "191.96.254.138:6185",    // US, Los Angeles
            "198.23.239.134:6540",    // US, Buffalo
            "107.172.163.27:6543",    // US, Bloomingdale
            "23.26.71.145:5628"       // US, Orem
    );

    private static final long CACHE_TTL_MS = 4 * 60 * 60 * 1000L;

    private record CacheEntry(String url, long expiresAt) {}
    private final Map<String, CacheEntry> cache = new ConcurrentHashMap<>();

    public String getAudioStreamUrl(String videoId) {
        CacheEntry cached = cache.get(videoId);
        if (cached != null && System.currentTimeMillis() < cached.expiresAt()) {
            log.debug("Cache hit for videoId: {}", videoId);
            return cached.url();
        }

        log.info("Extracting stream URL for videoId: {}", videoId);
        for (String proxy : PROXIES) {
            try {
                String url = extractWithProxy(videoId, proxy);
                if (url != null && !url.isBlank()) {
                    cache.put(videoId, new CacheEntry(url, System.currentTimeMillis() + CACHE_TTL_MS));
                    log.info("Stream URL extracted via {} for videoId: {}", proxy, videoId);
                    return url;
                }
            } catch (Exception e) {
                log.warn("Proxy {} failed for videoId {}: {}", proxy, videoId, e.getMessage());
            }
        }
        throw new RuntimeException("All proxies failed for videoId: " + videoId);
    }

    private String extractWithProxy(String videoId, String proxyHost) throws Exception {
        String proxyUrl = "http://" + PROXY_USER + ":" + PROXY_PASS + "@" + proxyHost;

        ProcessBuilder pb = new ProcessBuilder(
                "yt-dlp",
                "--no-playlist",
                "--proxy", proxyUrl,
                "-f", "bestaudio[ext=m4a]/bestaudio[acodec=aac]/bestaudio/best",
                "--retries", "2",
                "-g",
                "https://www.youtube.com/watch?v=" + videoId
        );
        pb.redirectErrorStream(false);

        Process process = pb.start();

        String url;
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(process.getInputStream()))) {
            url = reader.readLine();
        }

        String stderr;
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(process.getErrorStream()))) {
            stderr = reader.lines()
                    .filter(l -> l != null && !l.isBlank())
                    .reduce("", (a, b) -> a + "\n" + b);
        }

        boolean finished = process.waitFor(45, TimeUnit.SECONDS);
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
