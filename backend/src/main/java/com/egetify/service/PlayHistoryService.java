package com.egetify.service;

import com.egetify.dto.RecordPlayRequest;
import com.egetify.dto.SongDto;
import com.egetify.model.PlayHistory;
import com.egetify.model.Song;
import com.egetify.model.User;
import com.egetify.repository.PlayHistoryRepository;
import com.egetify.repository.SongRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class PlayHistoryService {

    private final PlayHistoryRepository playHistoryRepository;
    private final SongRepository songRepository;
    private final UserService userService;
    private final YouTubeService youTubeService;

    /** Called when user starts playing a song */
    @Transactional
    public void recordPlay(Long userId, RecordPlayRequest req) {
        User user = userService.getById(userId);

        // Ensure song is cached locally
        youTubeService.getVideoDetails(req.getYoutubeId());
        Song song = songRepository.findByYoutubeId(req.getYoutubeId())
                .orElseThrow();

        PlayHistory ph = PlayHistory.builder().user(user).song(song).build();
        playHistoryRepository.save(ph);
    }

    /** Returns the 20 most-recently played songs for the home feed */
    @Transactional(readOnly = true)
    public List<SongDto> getRecentlyPlayed(Long userId) {
        return playHistoryRepository
                .findRecentByUserId(userId, PageRequest.of(0, 20))
                .stream()
                .map(ph -> SongDto.builder()
                        .youtubeId(ph.getSong().getYoutubeId())
                        .title(ph.getSong().getTitle())
                        .channelTitle(ph.getSong().getChannelTitle())
                        .thumbnailUrl(ph.getSong().getThumbnailUrl())
                        .durationFormatted(ph.getSong().getDurationFormatted())
                        .build())
                .distinct()
                .toList();
    }

    /** Returns the last-played YouTube video ID (used to seed recommendations) */
    @Transactional(readOnly = true)
    public String getLastPlayedVideoId(Long userId) {
        List<String> ids = playHistoryRepository
                .findRecentYoutubeIdsByUserId(userId, PageRequest.of(0, 1));
        return ids.isEmpty() ? null : ids.get(0);
    }
}
