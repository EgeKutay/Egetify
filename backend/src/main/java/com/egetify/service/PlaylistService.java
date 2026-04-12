package com.egetify.service;

import com.egetify.dto.AddSongRequest;
import com.egetify.dto.CreatePlaylistRequest;
import com.egetify.dto.PlaylistDto;
import com.egetify.dto.SongDto;
import com.egetify.model.*;
import com.egetify.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class PlaylistService {

    private final PlaylistRepository playlistRepository;
    private final PlaylistSongRepository playlistSongRepository;
    private final SongRepository songRepository;
    private final UserService userService;
    private final YouTubeService youTubeService;

    // ── Playlist CRUD ─────────────────────────────────────────────────────────

    @Transactional
    public PlaylistDto createPlaylist(Long userId, CreatePlaylistRequest req) {
        User user = userService.getById(userId);
        Playlist playlist = Playlist.builder()
                .name(req.getName())
                .description(req.getDescription())
                .user(user)
                .build();
        Playlist saved = playlistRepository.save(playlist);
        return toDto(saved, false);
    }

    @Transactional(readOnly = true)
    public List<PlaylistDto> getUserPlaylists(Long userId) {
        return playlistRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(p -> toDto(p, false))
                .toList();
    }

    @Transactional(readOnly = true)
    public PlaylistDto getPlaylistDetail(Long userId, Long playlistId) {
        Playlist playlist = getOwnedPlaylist(userId, playlistId);
        return toDto(playlist, true);
    }

    @Transactional
    public void deletePlaylist(Long userId, Long playlistId) {
        Playlist playlist = getOwnedPlaylist(userId, playlistId);
        playlistRepository.delete(playlist);
    }

    // ── Song management ───────────────────────────────────────────────────────

    @Transactional
    public PlaylistDto addSong(Long userId, Long playlistId, AddSongRequest req) {
        Playlist playlist = getOwnedPlaylist(userId, playlistId);

        if (playlistSongRepository.existsByPlaylistIdAndSongId(playlistId,
                songRepository.findByYoutubeId(req.getYoutubeId())
                              .map(Song::getId).orElse(-1L))) {
            throw new IllegalStateException("Song already in playlist");
        }

        // Ensure song metadata is cached locally
        SongDto dto = youTubeService.getVideoDetails(req.getYoutubeId());
        Song song = songRepository.findByYoutubeId(req.getYoutubeId())
                .orElseThrow(() -> new RuntimeException("Song cache miss after fetch"));

        int nextPosition = playlistSongRepository.findMaxPosition(playlistId) + 1;
        PlaylistSong ps = PlaylistSong.builder()
                .playlist(playlist)
                .song(song)
                .position(nextPosition)
                .build();
        playlistSongRepository.save(ps);

        // Use first song's thumbnail as playlist cover
        if (playlist.getThumbnailUrl() == null) {
            playlist.setThumbnailUrl(song.getThumbnailUrl());
            playlistRepository.save(playlist);
        }

        return toDto(playlistRepository.findById(playlistId).orElseThrow(), true);
    }

    @Transactional
    public PlaylistDto removeSong(Long userId, Long playlistId, String youtubeId) {
        Playlist playlist = getOwnedPlaylist(userId, playlistId);

        Song song = songRepository.findByYoutubeId(youtubeId)
                .orElseThrow(() -> new IllegalArgumentException("Song not found: " + youtubeId));

        PlaylistSong ps = playlistSongRepository
                .findByPlaylistIdAndSongId(playlistId, song.getId())
                .orElseThrow(() -> new IllegalArgumentException("Song not in playlist"));

        int removedPosition = ps.getPosition();
        playlistSongRepository.delete(ps);
        playlistSongRepository.shiftPositionsDown(playlistId, removedPosition);

        return toDto(playlistRepository.findById(playlistId).orElseThrow(), true);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private Playlist getOwnedPlaylist(Long userId, Long playlistId) {
        return playlistRepository.findByIdAndUserId(playlistId, userId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Playlist not found or access denied: " + playlistId));
    }

    private PlaylistDto toDto(Playlist playlist, boolean includeSongs) {
        PlaylistDto dto = PlaylistDto.builder()
                .id(playlist.getId())
                .name(playlist.getName())
                .description(playlist.getDescription())
                .thumbnailUrl(playlist.getThumbnailUrl())
                .songCount(playlist.getPlaylistSongs().size())
                .build();

        if (includeSongs) {
            dto.setSongs(playlist.getPlaylistSongs().stream()
                    .map(ps -> SongDto.builder()
                            .youtubeId(ps.getSong().getYoutubeId())
                            .title(ps.getSong().getTitle())
                            .channelTitle(ps.getSong().getChannelTitle())
                            .thumbnailUrl(ps.getSong().getThumbnailUrl())
                            .durationFormatted(ps.getSong().getDurationFormatted())
                            .build())
                    .toList());
        }
        return dto;
    }
}
