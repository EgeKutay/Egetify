package com.egetify.controller;

import com.egetify.dto.SongDto;
import com.egetify.repository.SongRepository;
import com.egetify.security.UserPrincipal;
import com.egetify.service.InvidiousService;
import com.egetify.service.PlayHistoryService;
import com.egetify.service.YouTubeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Music search, recommendation and stream endpoints.
 *
 * GET /api/search?q=...            – search YouTube
 * GET /api/recommendations         – recommendations based on last-played song
 * GET /api/songs/{videoId}         – fetch metadata for a single video
 * GET /api/songs/{videoId}/stream  – fetch Invidious audio stream URL
 */
@RestController
@RequiredArgsConstructor
public class SearchController {

    private final YouTubeService youTubeService;
    private final PlayHistoryService playHistoryService;
    private final InvidiousService invidiousService;
    private final SongRepository songRepository;

    @GetMapping("/search")
    public ResponseEntity<List<SongDto>> search(@RequestParam String q) {
        return ResponseEntity.ok(youTubeService.search(q));
    }

    @GetMapping("/recommendations")
    public ResponseEntity<List<SongDto>> recommendations(
            @AuthenticationPrincipal UserPrincipal principal) {

        String lastPlayedId = playHistoryService.getLastPlayedVideoId(principal.getId());

        // Fall back to a generic "top music" search if user has no history
        List<SongDto> results = (lastPlayedId != null)
                ? youTubeService.getRecommendations(lastPlayedId)
                : youTubeService.search("top music 2024");

        return ResponseEntity.ok(results);
    }

    @GetMapping("/songs/{videoId}")
    public ResponseEntity<SongDto> getSong(@PathVariable String videoId) {
        return ResponseEntity.ok(youTubeService.getVideoDetails(videoId));
    }

    @GetMapping("/songs/{videoId}/stream")
    public CompletableFuture<ResponseEntity<Map<String, String>>> getStreamUrl(@PathVariable String videoId) {
        // Reject videos over 15 minutes before spawning yt-dlp
        songRepository.findByYoutubeId(videoId).ifPresent(song -> {
            if (song.getDuration() != null && parseDurationSeconds(song.getDuration()) > 900) {
                throw new IllegalArgumentException("Video exceeds maximum allowed duration of 15 minutes.");
            }
        });
        return invidiousService.getAudioStreamUrl(videoId)
                .thenApply(url -> ResponseEntity.ok(Map.of("url", url)));
    }

    private int parseDurationSeconds(String iso) {
        Pattern p = Pattern.compile("PT(?:(\\d+)H)?(?:(\\d+)M)?(?:(\\d+)S)?");
        Matcher m = p.matcher(iso);
        if (!m.matches()) return 0;
        int h   = m.group(1) != null ? Integer.parseInt(m.group(1)) : 0;
        int min = m.group(2) != null ? Integer.parseInt(m.group(2)) : 0;
        int sec = m.group(3) != null ? Integer.parseInt(m.group(3)) : 0;
        return h * 3600 + min * 60 + sec;
    }

}
