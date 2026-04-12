package com.egetify.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/** Sent by the frontend when the user starts playing a song. */
@Data
public class RecordPlayRequest {

    @NotBlank
    private String youtubeId;
}
