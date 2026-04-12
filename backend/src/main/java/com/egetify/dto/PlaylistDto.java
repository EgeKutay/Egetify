package com.egetify.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PlaylistDto {
    private Long id;
    private String name;
    private String description;
    private String thumbnailUrl;
    private int songCount;
    private List<SongDto> songs;    // null when listing many playlists; populated on detail view
}
