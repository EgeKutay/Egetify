package com.egetify.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;

/**
 * Provides a RestClient pre-configured for the YouTube Data API v3.
 * No external Google client library needed — plain HTTPS calls.
 */
@Configuration
public class YouTubeConfig {

    private static final String YOUTUBE_BASE_URL = "https://www.googleapis.com/youtube/v3";

    @Bean
    public RestClient youTubeRestClient() {
        return RestClient.builder()
                .baseUrl(YOUTUBE_BASE_URL)
                .defaultHeader("Accept", "application/json")
                .build();
    }
}
