package com.egetify.service;

import com.egetify.dto.SongDto;
import com.egetify.model.Song;
import com.egetify.repository.SongRepository;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Calls the YouTube Data API v3 over plain HTTPS using Spring RestClient.
 *
 * Quota strategy (daily limit: 10,000 units):
 *   search.list  = 100 units per call
 *   videos.list  = 1 unit per call
 *   All metadata is cached in PostgreSQL — zero quota cost on cache hit.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class YouTubeService {

    private final RestClient youTubeRestClient;
    private final SongRepository songRepository;

    @Value("${app.youtube.api-key}")
    private String apiKey;

    @Value("${app.youtube.max-results}")
    private int maxResults;

    // ── Response records (Jackson deserialisation) ────────────────────────────

    @JsonIgnoreProperties(ignoreUnknown = true)
    record SearchResponse(List<SearchItem> items) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    record SearchItem(SearchId id, Snippet snippet) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    record SearchId(String videoId) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    record VideoResponse(List<VideoItem> items) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    record VideoItem(String id, Snippet snippet, ContentDetails contentDetails, TopicDetails topicDetails) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    record TopicDetails(List<String> topicCategories) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    record Snippet(String title, String channelTitle, Map<String, Thumbnail> thumbnails) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    record Thumbnail(String url) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    record ContentDetails(String duration) {}

    // ── Public API ────────────────────────────────────────────────────────────

    /** Search YouTube for music videos matching the query (100 quota units) */
    @Transactional
    public List<SongDto> search(String query) {
        log.debug("YouTube search: {}", query);
        try {
            SearchResponse response = youTubeRestClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/search")
                            .queryParam("part", "snippet")
                            .queryParam("q", query)
                            .queryParam("type", "video")
                            .queryParam("videoCategoryId", "10")   // Music
                            .queryParam("maxResults", maxResults)
                            .queryParam("key", apiKey)
                            .build())
                    .retrieve()
                    .body(SearchResponse.class);

            if (response == null || response.items() == null) return List.of();

            List<String> videoIds = response.items().stream()
                    .filter(item -> item.id() != null && item.id().videoId() != null)
                    .map(item -> item.id().videoId())
                    .toList();

            return fetchAndCacheDetails(videoIds);
        } catch (Exception e) {
            log.error("YouTube search failed: {}", e.getMessage());
            throw new RuntimeException("YouTube search failed: " + e.getMessage());
        }
    }

    /**
     * Returns recommendations by searching for the artist/title of the seed video.
     * Note: YouTube's relatedToVideoId parameter was removed from the API in 2023.
     */
    @Transactional
    public List<SongDto> getRecommendations(String seedVideoId) {
        // Prefer genre-based search; fall back to artist name
        String query = songRepository.findByYoutubeId(seedVideoId)
                .map(s -> {
                    if (s.getGenre() != null && !s.getGenre().isBlank()) {
                        return s.getGenre();
                    }
                    return s.getChannelTitle() + " music";
                })
                .orElse("trending music");

        log.debug("Recommendations via search for seed {}: {}", seedVideoId, query);
        return search(query);
    }

    /**
     * Returns a SongDto for one video ID.
     * Hits PostgreSQL cache first — costs 0 API quota on a cache hit.
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

    // ── Private helpers ───────────────────────────────────────────────────────

    /**
     * For each ID: return from cache if present, otherwise call videos.list (1 unit each).
     */
    private List<SongDto> fetchAndCacheDetails(List<String> videoIds) {
        if (videoIds.isEmpty()) return List.of();

        List<String> uncachedIds = new ArrayList<>();
        List<SongDto> result = new ArrayList<>();

        for (String id : videoIds) {
            Optional<Song> cached = songRepository.findByYoutubeId(id);
            if (cached.isPresent()) {
                result.add(toDto(cached.get()));
            } else {
                uncachedIds.add(id);
            }
        }

        if (!uncachedIds.isEmpty()) {
            result.addAll(fetchFromYouTube(uncachedIds));
        }

        return result;
    }

    /** Calls videos.list for a batch of IDs and persists results (1 quota unit per call) */
    private List<SongDto> fetchFromYouTube(List<String> videoIds) {
        try {
            String ids = String.join(",", videoIds);
            VideoResponse response = youTubeRestClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/videos")
                            .queryParam("part", "snippet,contentDetails,topicDetails")
                            .queryParam("id", ids)
                            .queryParam("key", apiKey)
                            .build())
                    .retrieve()
                    .body(VideoResponse.class);

            if (response == null || response.items() == null) return List.of();

            List<SongDto> results = new ArrayList<>();
            for (VideoItem item : response.items()) {
                String duration = item.contentDetails() != null
                        ? item.contentDetails().duration() : null;
                String thumbUrl = getThumbnailUrl(item.snippet());

                String genre = extractGenre(item.topicDetails());

                Song song = Song.builder()
                        .youtubeId(item.id())
                        .title(item.snippet().title())
                        .channelTitle(item.snippet().channelTitle())
                        .thumbnailUrl(thumbUrl)
                        .duration(duration)
                        .durationFormatted(formatDuration(duration))
                        .genre(genre)
                        .build();

                songRepository.save(song);
                results.add(toDto(song));
            }
            return results;
        } catch (Exception e) {
            log.error("YouTube videos.list failed: {}", e.getMessage());
            return List.of();
        }
    }

    /** Extracts a readable genre from YouTube topicDetails Wikipedia URLs.
     *  e.g. "https://en.wikipedia.org/wiki/Rock_music" → "Rock music" */
    private String extractGenre(TopicDetails topicDetails) {
        if (topicDetails == null || topicDetails.topicCategories() == null) return null;
        return topicDetails.topicCategories().stream()
                .filter(url -> url != null && url.contains("wikipedia.org/wiki/"))
                .map(url -> url.substring(url.lastIndexOf('/') + 1)
                        .replace('_', ' ')
                        .replace("%27", "'"))
                .filter(g -> !g.equalsIgnoreCase("Music") && !g.equalsIgnoreCase("Musician"))
                .findFirst()
                .orElse(null);
    }

    private String getThumbnailUrl(Snippet snippet) {
        if (snippet == null || snippet.thumbnails() == null) return "";
        Thumbnail medium = snippet.thumbnails().get("medium");
        if (medium != null) return medium.url();
        Thumbnail def = snippet.thumbnails().get("default");
        return def != null ? def.url() : "";
    }

    /** Converts ISO 8601 duration (PT3M45S) → "3:45" */
    private String formatDuration(String iso) {
        if (iso == null) return "0:00";
        Pattern p = Pattern.compile("PT(?:(\\d+)H)?(?:(\\d+)M)?(?:(\\d+)S)?");
        Matcher m = p.matcher(iso);
        if (!m.matches()) return "0:00";
        int h   = m.group(1) != null ? Integer.parseInt(m.group(1)) : 0;
        int min = m.group(2) != null ? Integer.parseInt(m.group(2)) : 0;
        int sec = m.group(3) != null ? Integer.parseInt(m.group(3)) : 0;
        return h > 0 ? String.format("%d:%02d:%02d", h, min, sec)
                     : String.format("%d:%02d", min, sec);
    }

    private SongDto toDto(Song song) {
        return SongDto.builder()
                .youtubeId(song.getYoutubeId())
                .title(song.getTitle())
                .channelTitle(song.getChannelTitle())
                .thumbnailUrl(song.getThumbnailUrl())
                .durationFormatted(song.getDurationFormatted())
                .genre(song.getGenre())
                .build();
    }
}
