package com.egetify.repository;

import com.egetify.model.Song;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface SongRepository extends JpaRepository<Song, Long> {

    /** Look up cached song by YouTube video ID */
    Optional<Song> findByYoutubeId(String youtubeId);

    boolean existsByYoutubeId(String youtubeId);
}
