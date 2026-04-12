package com.egetify.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CreatePlaylistRequest {

    @NotBlank(message = "Playlist name is required")
    @Size(max = 100)
    private String name;

    @Size(max = 300)
    private String description;
}
