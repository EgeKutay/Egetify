package com.egetify.service;

import com.egetify.dto.AuthResponse;
import com.egetify.dto.GoogleAuthRequest;
import com.egetify.dto.UserDto;
import com.egetify.model.User;
import com.egetify.repository.UserRepository;
import com.egetify.security.JwtTokenProvider;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthException;
import com.google.firebase.auth.FirebaseToken;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final JwtTokenProvider tokenProvider;

    @Transactional
    public AuthResponse loginWithGoogle(GoogleAuthRequest request) {
        FirebaseToken decoded = verifyFirebaseToken(request.getIdToken());

        String firebaseUid = decoded.getUid();
        String email       = decoded.getEmail();
        String name        = decoded.getName();
        String pictureUrl  = decoded.getPicture();

        User user = userRepository.findByGoogleId(firebaseUid)
                .map(existing -> {
                    existing.setName(name);
                    existing.setEmail(email);
                    existing.setPictureUrl(pictureUrl);
                    return userRepository.save(existing);
                })
                .orElseGet(() -> userRepository.save(
                        User.builder()
                            .googleId(firebaseUid)
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

    private FirebaseToken verifyFirebaseToken(String idTokenString) {
        try {
            return FirebaseAuth.getInstance().verifyIdToken(idTokenString);
        } catch (FirebaseAuthException e) {
            log.error("Firebase token verification failed: {}", e.getMessage());
            throw new IllegalArgumentException("Firebase token verification failed: " + e.getMessage());
        }
    }
}
