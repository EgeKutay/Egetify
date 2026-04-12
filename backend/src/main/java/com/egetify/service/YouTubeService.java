package com.egetify.service;

import com.egetify.dto.SongDto;
import com.egetify.model.Song;
import com.egetify.repository.SongRepository;
import com.google.api.services.youtube.YouTube;
import com.google.api.services.youtube.model.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Wraps the YouTube Data API v3.
 *
 * Quota strategy:
 *  - search.list  = 100 units per call
 *  - videos.list  = 1 unit per call (used for duration lookup)
 *  - All fetched metadata is persisted in PostgreSQL to avoid re-fetching.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class YouTubeService {

    private final YouTube youTube;
    private final SongRepository songRepository;

    @Value("${app.youtube.api-key}")
    private String apiKey;

    @Value("${app.youtube.max-results}")
    private long maxResults;

    // ───── Public API ────────────────────────────────────────────────────────

    /** Search YouTube for music videos matching the query */
    @Transactional
    public List<SongDto> search(String query) {
        log.debug("YouTube search: {}", query);
        try {
            SearchListResponse response = youTube.search().list(List.of("snippet"))
                    .setKey(apiKey)
                    .setQ(query)
                    .setType(List.of("video"))
                    .setVideoCategoryId("10")  // Music category
                    .setMaxResults(maxResults)
                    .execute();

            List<String> videoIds = response.getItems().stream()
                    .map(item -> item.getId().getVideoId())
                    .toList();

            return fetchAndCacheDetails(videoIds);
        } catch (IOException e) {
            log.error("YouTube search failed: {}", e.getMessage());
            throw new RuntimeException("YouTube search failed", e);
        }
    }

    /**
     * Returns related/recommended videos for a given YouTube video ID.
     * Uses the relatedToVideoId parameter (search.list, 100 units).
     */
    @Transactional
    public List<SongDto> getRecommendations(String videoId) {
        log.debug("Fetching recommendations for videoId: {}", videoId);
        try {
            SearchListResponse response = youTube.search().list(List.of("snippet"))
                    .setKey(apiKey)
                    .setRelatedToVideoId(videoId)
                    .setType(List.of("video"))
                    .setMaxResults(maxResults)
                    .execute();

            List<String> videoIds = response.getItems().stream()
                    .filter(item -> item.getId().getVideoId() != null)
                    .map(item -> item.getId().getVideoId())
                    .toList();

            return fetchAndCacheDetails(videoIds);
        } catch (IOException e) {
            log.error("YouTube recommendations failed: {}", e.getMessage());
            throw new RuntimeException("YouTube recommendations failed", e);
        }
    }

    /**
     * Returns a SongDto for one video ID.
     * Checks the PostgreSQL cache first – costs 0 API units on cache hit.
     */
    @Transactional
    public SongDto getVideoDetails(String videoId) {
        return songRepository.findByYoutubeId(videoId)
                .map(this::toDto)
                .orElseGet(() -> fetchAndCacheDetails(List.of(videoId))
                        .stream()
                        .findFirst()
                        .orElseThrow(() -> new RuntimeException("Video not found: " + videoId)));
    }

    // ───── Helpers ───────────────────────────────────────────────────────────

    /**
     * Fetches full video details (snippet + contentDetails) for a batch of IDs.
     * Persists results to the song cache.  Returns DTOs in the same order.
     */
    private List<SongDto> fetchAndCacheDetails(List<String> videoIds) {
        if (videoIds.isEmpty()) return List.of();

        // Check which IDs are already cached
        List<SongDto> result = new ArrayList<>();
        List<String> uncachedIds = new ArrayList<>();

        for (String id : videoIds) {
            Optional<Song> cached = songRepository.findByYoutubeId(id);
            if (cached.isPresent()) {
                result.add(toDto(cached.get()));
            } else {
                uncachedIds.add(id);
                result.add(null);   // placeholder; filled after API call
            }
        }

        if (!uncachedIds.isEmpty()) {
            List<Song> fetched = fetchFromYouTube(uncachedIds);
            // Replace placeholders in result list
            int fetchedIdx = 0;
            for (int i = 0; i < result.size(); i++) {
                if (result.get(i) == null && fetchedIdx < fetched.size()) {
                    result.set(i, toDto(fetched.get(fetchedIdx++)));
                }
            }
        }

        return result.stream().filter(d -> d != null).toList();
    }

    private List<Song> fetchFromYouTube(List<String> videoIds) {
        try {
            VideoListResponse response = youTube.videos()
                    .list(List.of("snippet", "contentDetails"))
                    .setKey(apiKey)
                    .setId(videoIds)
                    .execute();

            List<Song> songs = new ArrayList<>();
            for (Video video : response.getItems()) {
                String duration = video.getContentDetails().getDuration();
                Song song = Song.builder()
                        .youtubeId(video.getId())
                        .title(video.getSnippet().getTitle())
                        .channelTitle(video.getSnippet().getChannelTitle())
                        .thumbnailUrl(getThumbnailUrl(video))
                        .duration(duration)
                        .durationFormatted(formatDuration(duration))
                        .build();
                songs.add(songRepository.save(song));
            }
            return songs;
        } catch (IOException e) {
            log.error("YouTube videos.list failed: {}", e.getMessage());
            return List.of();
        }
    }

    private String getThumbnailUrl(Video video) {
        ThumbnailDetails thumbnails = video.getSnippet().getThumbnails();
        if (thumbnails.getMedium() != null)  return thumbnails.getMedium().getUrl();
        if (thumbnails.getDefault() != null) return thumbnails.getDefault().getUrl();
        return "";
    }

    /**
     * Converts ISO 8601 duration (PT3M45S) to human-readable "3:45".
     */
    private String formatDuration(String iso) {
        if (iso == null) return "0:00";
        Pattern p = Pattern.compile("PT(?:(\\d+)H)?(?:(\\d+)M)?(?:(\\d+)S)?");
        Matcher m = p.matcher(iso);
        if (!m.matches()) return "0:00";
        int h = m.group(1) != null ? Integer.parseInt(m.group(1)) : 0;
        int min = m.group(2) != null ? Integer.parseInt(m.group(2)) : 0;
        int sec = m.group(3) != null ? Integer.parseInt(m.group(3)) : 0;
        if (h > 0) return String.format("%d:%02d:%02d", h, min, sec);
        return String.format("%d:%02d", min, sec);
    }

    private SongDto toDto(Song song) {
        return SongDto.builder()
                .youtubeId(song.getYoutubeId())
                .title(song.getTitle())
                .channelTitle(song.getChannelTitle())
                .thumbnailUrl(song.getThumbnailUrl())
                .durationFormatted(song.getDurationFormatted())
                .build();
    }
}
