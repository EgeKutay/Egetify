package com.egetify.controller;

import com.egetify.dto.SongDto;
import com.egetify.repository.SongRepository;
import com.egetify.security.JwtTokenProvider;
import com.egetify.security.UserPrincipal;
import com.egetify.service.InvidiousService;
import com.egetify.service.PlayHistoryService;
import com.egetify.service.YouTubeService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Music search, recommendation and stream endpoints.
 *
 * GET /api/search?q=...            – search YouTube
 * GET /api/recommendations         – recommendations based on last-played song
 * GET /api/songs/{videoId}         – fetch metadata for a single video
 * GET /api/songs/{videoId}/stream  – fetch Invidious audio stream URL
 */
@RestController
@RequiredArgsConstructor
public class SearchController {

    private final YouTubeService youTubeService;
    private final PlayHistoryService playHistoryService;
    private final InvidiousService invidiousService;
    private final SongRepository songRepository;
    private final JwtTokenProvider jwtTokenProvider;

    @GetMapping("/search")
    public ResponseEntity<List<SongDto>> search(@RequestParam String q) {
        return ResponseEntity.ok(youTubeService.search(q));
    }

    @GetMapping("/recommendations")
    public ResponseEntity<List<SongDto>> recommendations(
            @AuthenticationPrincipal UserPrincipal principal) {

        String lastPlayedId = playHistoryService.getLastPlayedVideoId(principal.getId());

        // Fall back to a generic "top music" search if user has no history
        List<SongDto> results = (lastPlayedId != null)
                ? youTubeService.getRecommendations(lastPlayedId)
                : youTubeService.search("top music 2024");

        return ResponseEntity.ok(results);
    }

    @GetMapping("/songs/{videoId}")
    public ResponseEntity<SongDto> getSong(@PathVariable String videoId) {
        return ResponseEntity.ok(youTubeService.getVideoDetails(videoId));
    }

    @GetMapping("/songs/{videoId}/stream")
    public ResponseEntity<Map<String, String>> getStreamUrl(@PathVariable String videoId) throws Exception {
        songRepository.findByYoutubeId(videoId).ifPresent(song -> {
            if (song.getDuration() != null && parseDurationSeconds(song.getDuration()) > 900) {
                throw new IllegalArgumentException("Video exceeds maximum allowed duration of 15 minutes.");
            }
        });
        String url = invidiousService.getAudioStreamUrl(videoId).get(60, TimeUnit.SECONDS);
        return ResponseEntity.ok(Map.of("url", url));
    }

    /**
     * Streams audio through the backend so the phone never hits YouTube CDN directly.
     * JWT passed as query param because ExoPlayer uses its own HTTP client.
     * Public endpoint (auth checked manually via token param).
     */
    @GetMapping("/songs/{videoId}/audio")
    public void proxyAudio(@PathVariable String videoId,
                           @RequestParam("token") String token,
                           HttpServletRequest request,
                           HttpServletResponse response) throws Exception {
        if (!StringUtils.hasText(token) || !jwtTokenProvider.validateToken(token)) {
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED);
            return;
        }

        String cdnUrl = invidiousService.getAudioStreamUrl(videoId).get(60, TimeUnit.SECONDS);

        HttpURLConnection conn = (HttpURLConnection) new URL(cdnUrl).openConnection();
        conn.setRequestProperty("User-Agent", "Mozilla/5.0");
        conn.setRequestProperty("Accept", "*/*");

        // Forward Range header for seeking support
        String range = request.getHeader("Range");
        if (StringUtils.hasText(range)) conn.setRequestProperty("Range", range);

        conn.connect();

        int status = conn.getResponseCode();
        response.setStatus(status);

        String contentType = conn.getContentType();
        if (StringUtils.hasText(contentType)) response.setContentType(contentType);

        String contentRange = conn.getHeaderField("Content-Range");
        if (StringUtils.hasText(contentRange)) response.setHeader("Content-Range", contentRange);

        long contentLength = conn.getContentLengthLong();
        if (contentLength > 0) response.setHeader("Content-Length", String.valueOf(contentLength));

        response.setHeader("Accept-Ranges", "bytes");

        try (InputStream in = conn.getInputStream()) {
            in.transferTo(response.getOutputStream());
        }
    }

    private int parseDurationSeconds(String iso) {
        Pattern p = Pattern.compile("PT(?:(\\d+)H)?(?:(\\d+)M)?(?:(\\d+)S)?");
        Matcher m = p.matcher(iso);
        if (!m.matches()) return 0;
        int h   = m.group(1) != null ? Integer.parseInt(m.group(1)) : 0;
        int min = m.group(2) != null ? Integer.parseInt(m.group(2)) : 0;
        int sec = m.group(3) != null ? Integer.parseInt(m.group(3)) : 0;
        return h * 3600 + min * 60 + sec;
    }

}
