package com.egetify.controller;

import com.egetify.dto.SongDto;
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
    public ResponseEntity<Map<String, String>> getStreamUrl(@PathVariable String videoId) {
        String url = invidiousService.getAudioStreamUrl(videoId);
        return ResponseEntity.ok(Map.of("url", url));
    }

}
