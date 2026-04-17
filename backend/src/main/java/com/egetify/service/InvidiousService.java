package com.egetify.service;

import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;

/**
 * Extracts audio stream URLs via yt-dlp routed through residential proxies.
 * EU proxies are listed first for lower latency. Results are cached for 4 hours
 * since YouTube stream URLs typically expire after ~6 hours.
 */
@Service
public class InvidiousService {

    private static final String PROXY_USER = "ownydbfo";
    private static final String PROXY_PASS = "w6k0edt4fzfi";

    // EU proxies first, then fallbacks
    private static final List<String> PROXIES = List.of(
            "31.58.9.4:6077",         // DE, Frankfurt
            "31.59.20.176:6754",      // UK, London
            "45.38.107.97:6014",      // UK, London
            "198.105.121.200:6462",   // UK, City of London
            "198.23.239.134:6540",    // US, Buffalo (fallback)
            "107.172.163.27:6543"     // US, Bloomingdale (fallback)
    );

    private static final long CACHE_TTL_MS = 4 * 60 * 60 * 1000L; // 4 hours

    private record CacheEntry(String url, long expiresAt) {}
    private final Map<String, CacheEntry> cache = new ConcurrentHashMap<>();

    public String getAudioStreamUrl(String videoId) {
        CacheEntry cached = cache.get(videoId);
        if (cached != null && System.currentTimeMillis() < cached.expiresAt()) {
            return cached.url();
        }

        for (String proxy : PROXIES) {
            try {
                String url = extractWithProxy(videoId, proxy);
                if (url != null && !url.isBlank()) {
                    cache.put(videoId, new CacheEntry(url, System.currentTimeMillis() + CACHE_TTL_MS));
                    return url;
                }
            } catch (Exception ignored) {
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
                "-f", "bestaudio/best",
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

        boolean finished = process.waitFor(30, TimeUnit.SECONDS);
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
