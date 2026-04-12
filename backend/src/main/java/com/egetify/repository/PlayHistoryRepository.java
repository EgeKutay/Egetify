package com.egetify.repository;

import com.egetify.model.PlayHistory;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface PlayHistoryRepository extends JpaRepository<PlayHistory, Long> {

    /**
     * Fetches the most-recently played songs for a user.
     * Distinct by song so duplicates don't flood the home feed.
     */
    @Query("""
        SELECT ph FROM PlayHistory ph
        WHERE ph.user.id = :userId
        ORDER BY ph.playedAt DESC
        """)
    List<PlayHistory> findRecentByUserId(@Param("userId") Long userId, Pageable pageable);

    /** Last-played song for a user – used to seed YouTube recommendations */
    @Query("""
        SELECT ph.song.youtubeId FROM PlayHistory ph
        WHERE ph.user.id = :userId
        ORDER BY ph.playedAt DESC
        """)
    List<String> findRecentYoutubeIdsByUserId(@Param("userId") Long userId, Pageable pageable);
}
