package com.egetify.controller;

import com.egetify.dto.RecordPlayRequest;
import com.egetify.dto.SongDto;
import com.egetify.security.UserPrincipal;
import com.egetify.service.PlayHistoryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Tracks plays and serves recently-played songs for the home feed.
 *
 * POST /api/history          – record that a song was played
 * GET  /api/history/recent   – get recently played songs
 */
@RestController
@RequestMapping("/history")
@RequiredArgsConstructor
public class HistoryController {

    private final PlayHistoryService playHistoryService;

    @PostMapping
    public ResponseEntity<Void> recordPlay(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody RecordPlayRequest req) {
        playHistoryService.recordPlay(principal.getId(), req);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/recent")
    public ResponseEntity<List<SongDto>> recentlyPlayed(
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(playHistoryService.getRecentlyPlayed(principal.getId()));
    }
}
