package com.egetify.model;

import jakarta.persistence.*;
import lombok.*;

/**
 * Join entity between Playlist and Song.
 * Stores the position (order) of each song within a playlist.
 */
@Entity
@Table(name = "playlist_songs", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"playlist_id", "song_id"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PlaylistSong {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "playlist_id", nullable = false)
    private Playlist playlist;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "song_id", nullable = false)
    private Song song;

    /** Zero-based position within the playlist */
    @Column(nullable = false)
    private int position;
}
