package com.egetify.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Lightweight song representation sent to the frontend. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SongDto {
    private String youtubeId;
    private String title;
    private String channelTitle;
    private String thumbnailUrl;
    private String durationFormatted;
}
