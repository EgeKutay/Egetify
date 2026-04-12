package com.egetify.controller;

import com.egetify.dto.AuthResponse;
import com.egetify.dto.GoogleAuthRequest;
import com.egetify.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Authentication endpoints (public – no JWT required).
 *
 * POST /api/auth/google   – exchange Google ID token for our JWT
 */
@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/google")
    public ResponseEntity<AuthResponse> googleLogin(@Valid @RequestBody GoogleAuthRequest req) {
        AuthResponse response = authService.loginWithGoogle(req);
        return ResponseEntity.ok(response);
    }
}
