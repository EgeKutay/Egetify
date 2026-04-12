package com.egetify.config;

import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.json.jackson2.JacksonFactory;
import com.google.api.services.youtube.YouTube;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Builds the YouTube Data API v3 client.
 * The API key is injected at runtime from application.yml.
 */
@Configuration
public class YouTubeConfig {

    @Bean
    public YouTube youTube() throws Exception {
        return new YouTube.Builder(
                GoogleNetHttpTransport.newTrustedTransport(),
                JacksonFactory.getDefaultInstance(),
                request -> {}   // no credentials needed for search (API key used per-request)
        ).setApplicationName("Egetify").build();
    }
}
