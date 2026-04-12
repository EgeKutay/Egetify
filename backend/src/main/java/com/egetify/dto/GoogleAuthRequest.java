package com.egetify.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * Frontend sends the Google ID token obtained from Google Sign-In.
 * Backend verifies it and issues a JWT.
 */
@Data
public class GoogleAuthRequest {

    @NotBlank(message = "Google ID token must not be blank")
    private String idToken;
}
