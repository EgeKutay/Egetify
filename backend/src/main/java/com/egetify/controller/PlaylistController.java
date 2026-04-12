package com.egetify.controller;

import com.egetify.dto.AddSongRequest;
import com.egetify.dto.CreatePlaylistRequest;
import com.egetify.dto.PlaylistDto;
import com.egetify.security.UserPrincipal;
import com.egetify.service.PlaylistService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Playlist CRUD + song management.
 *
 * GET    /api/playlists              – list user's playlists
 * POST   /api/playlists              – create playlist
 * GET    /api/playlists/{id}         – get playlist with songs
 * DELETE /api/playlists/{id}         – delete playlist
 * POST   /api/playlists/{id}/songs   – add song
 * DELETE /api/playlists/{id}/songs/{youtubeId} – remove song
 */
@RestController
@RequestMapping("/playlists")
@RequiredArgsConstructor
public class PlaylistController {

    private final PlaylistService playlistService;

    @GetMapping
    public ResponseEntity<List<PlaylistDto>> getPlaylists(
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(playlistService.getUserPlaylists(principal.getId()));
    }

    @PostMapping
    public ResponseEntity<PlaylistDto> createPlaylist(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody CreatePlaylistRequest req) {
        PlaylistDto created = playlistService.createPlaylist(principal.getId(), req);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @GetMapping("/{id}")
    public ResponseEntity<PlaylistDto> getPlaylist(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id) {
        return ResponseEntity.ok(playlistService.getPlaylistDetail(principal.getId(), id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePlaylist(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id) {
        playlistService.deletePlaylist(principal.getId(), id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/songs")
    public ResponseEntity<PlaylistDto> addSong(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id,
            @Valid @RequestBody AddSongRequest req) {
        return ResponseEntity.ok(playlistService.addSong(principal.getId(), id, req));
    }

    @DeleteMapping("/{id}/songs/{youtubeId}")
    public ResponseEntity<PlaylistDto> removeSong(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id,
            @PathVariable String youtubeId) {
        return ResponseEntity.ok(playlistService.removeSong(principal.getId(), id, youtubeId));
    }
}
