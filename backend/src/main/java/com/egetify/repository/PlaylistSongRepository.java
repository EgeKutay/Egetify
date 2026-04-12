package com.egetify.repository;

import com.egetify.model.PlaylistSong;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface PlaylistSongRepository extends JpaRepository<PlaylistSong, Long> {

    Optional<PlaylistSong> findByPlaylistIdAndSongId(Long playlistId, Long songId);

    boolean existsByPlaylistIdAndSongId(Long playlistId, Long songId);

    /** Shift positions down by 1 for all songs after a removed position */
    @Modifying
    @Query("""
        UPDATE PlaylistSong ps
        SET ps.position = ps.position - 1
        WHERE ps.playlist.id = :playlistId
          AND ps.position > :removedPosition
        """)
    void shiftPositionsDown(@Param("playlistId") Long playlistId,
                            @Param("removedPosition") int removedPosition);

    /** Max position in a playlist – used when appending a new song */
    @Query("""
        SELECT COALESCE(MAX(ps.position), -1)
        FROM PlaylistSong ps
        WHERE ps.playlist.id = :playlistId
        """)
    int findMaxPosition(@Param("playlistId") Long playlistId);
}
