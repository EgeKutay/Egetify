package com.egetify.repository;

import com.egetify.model.Playlist;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface PlaylistRepository extends JpaRepository<Playlist, Long> {

    /** All playlists that belong to a user, newest first */
    List<Playlist> findByUserIdOrderByCreatedAtDesc(Long userId);

    /** Verify ownership before modification */
    Optional<Playlist> findByIdAndUserId(Long id, Long userId);

    @Query("SELECT COUNT(ps) FROM PlaylistSong ps WHERE ps.playlist.id = :playlistId")
    int countSongs(@Param("playlistId") Long playlistId);
}
