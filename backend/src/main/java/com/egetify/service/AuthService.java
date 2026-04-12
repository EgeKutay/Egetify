package com.egetify.service;

import com.egetify.dto.AuthResponse;
import com.egetify.dto.GoogleAuthRequest;
import com.egetify.dto.UserDto;
import com.egetify.model.User;
import com.egetify.repository.UserRepository;
import com.egetify.security.JwtTokenProvider;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;

/**
 * Handles Google Sign-In token verification and JWT issuance.
 *
 * Flow:
 *   1. Frontend obtains a Google ID token via Google Sign-In SDK.
 *   2. Frontend sends the token to POST /api/auth/google.
 *   3. This service verifies it with Google's servers.
 *   4. Creates or fetches the user in our DB.
 *   5. Returns our own JWT so the frontend can authenticate future requests.
 */
@Slf4j
@Service
public class AuthService {

    private final UserRepository userRepository;
    private final JwtTokenProvider tokenProvider;
    private final GoogleIdTokenVerifier googleVerifier;

    public AuthService(UserRepository userRepository,
                       JwtTokenProvider tokenProvider,
                       @Value("${app.google.client-id}") String googleClientId) throws Exception {
        this.userRepository = userRepository;
        this.tokenProvider = tokenProvider;
        this.googleVerifier = new GoogleIdTokenVerifier.Builder(
                GoogleNetHttpTransport.newTrustedTransport(),
                GsonFactory.getDefaultInstance())
                .setAudience(Collections.singletonList(googleClientId))
                .build();
    }

    @Transactional
    public AuthResponse loginWithGoogle(GoogleAuthRequest request) {
        GoogleIdToken.Payload payload = verifyGoogleToken(request.getIdToken());

        String googleId  = payload.getSubject();
        String email     = payload.getEmail();
        String name      = (String) payload.get("name");
        String pictureUrl = (String) payload.get("picture");

        // Upsert: create user on first login, update profile on subsequent logins
        User user = userRepository.findByGoogleId(googleId)
                .map(existing -> {
                    existing.setName(name);
                    existing.setEmail(email);
                    existing.setPictureUrl(pictureUrl);
                    return userRepository.save(existing);
                })
                .orElseGet(() -> userRepository.save(
                        User.builder()
                            .googleId(googleId)
                            .email(email)
                            .name(name)
                            .pictureUrl(pictureUrl)
                            .build()));

        String jwt = tokenProvider.generateToken(user.getId());

        return AuthResponse.builder()
                .accessToken(jwt)
                .tokenType("Bearer")
                .expiresIn(tokenProvider.getExpirationMs())
                .user(UserDto.builder()
                        .id(user.getId())
                        .email(user.getEmail())
                        .name(user.getName())
                        .pictureUrl(user.getPictureUrl())
                        .build())
                .build();
    }

    private GoogleIdToken.Payload verifyGoogleToken(String idTokenString) {
        try {
            GoogleIdToken idToken = googleVerifier.verify(idTokenString);
            if (idToken == null) {
                throw new IllegalArgumentException("Invalid Google ID token");
            }
            return idToken.getPayload();
        } catch (Exception e) {
            log.error("Google token verification failed: {}", e.getMessage());
            throw new IllegalArgumentException("Google token verification failed: " + e.getMessage());
        }
    }
}
