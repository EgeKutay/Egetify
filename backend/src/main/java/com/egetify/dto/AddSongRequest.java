package com.egetify.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/** Request body when adding a song to a playlist. */
@Data
public class AddSongRequest {

    @NotBlank(message = "YouTube video ID is required")
    private String youtubeId;
}
