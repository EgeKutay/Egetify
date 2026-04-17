package com.egetify.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * Cached metadata for a YouTube video used as a song.
 * Caching here reduces YouTube Data API quota consumption
 * (daily limit: 10,000 units).
 */
@Entity
@Table(name = "songs", indexes = {
    @Index(name = "idx_song_youtube_id", columnList = "youtube_id", unique = true)
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Song {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** YouTube video ID (e.g. "dQw4w9WgXcQ") */
    @Column(name = "youtube_id", nullable = false, unique = true)
    private String youtubeId;

    @Column(nullable = false)
    private String title;

    /** Channel name (artist equivalent) */
    @Column(nullable = false)
    private String channelTitle;

    /** Thumbnail URL (medium quality) */
    @Column(name = "thumbnail_url")
    private String thumbnailUrl;

    /** ISO 8601 duration string (e.g. "PT3M45S") */
    @Column
    private String duration;

    /** Human-readable duration (e.g. "3:45") */
    @Column(name = "duration_formatted")
    private String durationFormatted;

    /** Music genre extracted from YouTube topicDetails (e.g. "Rock music") */
    @Column
    private String genre;

    /** When this cache entry was last fetched from YouTube */
    @Column(name = "cached_at")
    private LocalDateTime cachedAt;

    @PrePersist
    protected void onCreate() {
        cachedAt = LocalDateTime.now();
    }
}
