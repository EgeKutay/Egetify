package com.egetify.service;

import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.util.concurrent.TimeUnit;

/**
 * Extracts direct audio stream URLs using yt-dlp running locally.
 * yt-dlp must be on PATH: winget install yt-dlp.yt-dlp
 */
@Service
public class InvidiousService {

    /**
     * Returns a direct audio stream URL for the given YouTube video ID.
     * Uses yt-dlp to extract the best available audio stream locally —
     * no third-party servers, no ads, no rate limits.
     *
     * @throws RuntimeException if yt-dlp is not installed or extraction fails
     */
    public String getAudioStreamUrl(String videoId) {
        try {
            ProcessBuilder pb = new ProcessBuilder(
                    "yt-dlp",
                    "--no-playlist",
                    "--no-warnings",
                    "-f", "bestaudio[ext=m4a]/bestaudio[ext=webm]/bestaudio",
                    "-g",   // print URL only, don't download
                    "https://www.youtube.com/watch?v=" + videoId
            );
            pb.redirectErrorStream(false);

            Process process = pb.start();

            // Read stdout (the URL)
            String url;
            try (BufferedReader reader = new BufferedReader(
                    new InputStreamReader(process.getInputStream()))) {
                url = reader.readLine();
            }

            // Read stderr for diagnostics
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

        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("Failed to extract stream URL for " + videoId + ": " + e.getMessage(), e);
        }
    }
}
