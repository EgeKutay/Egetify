package com.egetify.steps;

import com.egetify.model.Playlist;
import com.egetify.model.User;
import com.egetify.repository.PlaylistRepository;
import com.egetify.repository.UserRepository;
import com.egetify.security.JwtTokenProvider;
import io.cucumber.java.Before;
import io.cucumber.java.en.*;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.*;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Shared BDD step definitions used across all feature files.
 */
@RequiredArgsConstructor
public class CommonSteps {

    @Autowired private TestRestTemplate restTemplate;
    @Autowired private UserRepository userRepository;
    @Autowired private PlaylistRepository playlistRepository;
    @Autowired private JwtTokenProvider jwtTokenProvider;

    @LocalServerPort
    private int port;

    private String jwtToken;
    private ResponseEntity<String> lastResponse;
    private Long testPlaylistId;

    private String baseUrl() {
        return "http://localhost:" + port + "/api";
    }

    private HttpHeaders headers() {
        HttpHeaders h = new HttpHeaders();
        h.setContentType(MediaType.APPLICATION_JSON);
        if (jwtToken != null) {
            h.setBearerAuth(jwtToken);
        }
        return h;
    }

    // ── Givens ────────────────────────────────────────────────────────────────

    @Given("the backend is running")
    public void theBackendIsRunning() {
        // Spring Boot context is already up – nothing to do
    }

    @Given("a registered user with id {int} and a valid JWT token")
    public void aRegisteredUserWithToken(int unused) {
        // Create or fetch deterministic test user
        User user = userRepository.findByGoogleId("test-google-id")
                .orElseGet(() -> userRepository.save(
                        User.builder()
                            .googleId("test-google-id")
                            .email("test@egetify.com")
                            .name("Test User")
                            .build()));
        jwtToken = jwtTokenProvider.generateToken(user.getId());
    }

    @Given("no JWT token is set")
    public void noJwtToken() {
        jwtToken = null;
    }

    @Given("the user has a playlist named {string}")
    public void userHasPlaylist(String name) {
        User user = userRepository.findByGoogleId("test-google-id").orElseThrow();
        Playlist p = playlistRepository.save(
                Playlist.builder().name(name).user(user).build());
        testPlaylistId = p.getId();
    }

    @Given("a different user's playlist with id {int}")
    public void differentUsersPlaylist(int id) {
        // Playlist id 999 doesn't belong to our test user – no action needed
    }

    @Given("the user has played a song with youtubeId {string}")
    public void userHasPlayedSong(String videoId) {
        // Record a play via the API
        String body = "{\"youtubeId\":\"" + videoId + "\"}";
        restTemplate.exchange(
                baseUrl() + "/history",
                HttpMethod.POST,
                new HttpEntity<>(body, headers()),
                String.class);
    }

    // ── Whens ─────────────────────────────────────────────────────────────────

    @When("I POST to {string} with body:")
    public void iPost(String path, String body) {
        lastResponse = restTemplate.exchange(
                baseUrl() + path, HttpMethod.POST,
                new HttpEntity<>(body, headers()), String.class);
    }

    @When("I GET {string}")
    public void iGet(String path) {
        lastResponse = restTemplate.exchange(
                baseUrl() + path, HttpMethod.GET,
                new HttpEntity<>(headers()), String.class);
    }

    @When("I DELETE the playlist {string}")
    public void iDeletePlaylist(String name) {
        User user = userRepository.findByGoogleId("test-google-id").orElseThrow();
        Playlist p = playlistRepository.findByUserIdOrderByCreatedAtDesc(user.getId())
                .stream().filter(pl -> pl.getName().equals(name)).findFirst().orElseThrow();
        lastResponse = restTemplate.exchange(
                baseUrl() + "/playlists/" + p.getId(),
                HttpMethod.DELETE,
                new HttpEntity<>(headers()), String.class);
    }

    // ── Thens ─────────────────────────────────────────────────────────────────

    @Then("the response status is {int}")
    public void responseStatusIs(int status) {
        assertThat(lastResponse.getStatusCode().value()).isEqualTo(status);
    }

    @Then("the response body contains {string}")
    public void responseBodyContains(String text) {
        assertThat(lastResponse.getBody()).contains(text);
    }

    @Then("the playlist {string} no longer exists")
    public void playlistNoLongerExists(String name) {
        User user = userRepository.findByGoogleId("test-google-id").orElseThrow();
        boolean exists = playlistRepository.findByUserIdOrderByCreatedAtDesc(user.getId())
                .stream().anyMatch(p -> p.getName().equals(name));
        assertThat(exists).isFalse();
    }

    @Before
    public void resetState() {
        jwtToken = null;
        lastResponse = null;
        testPlaylistId = null;
    }
}
