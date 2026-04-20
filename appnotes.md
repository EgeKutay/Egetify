# Egetify — Lessons Learned

A practical reference for building a React Native + Spring Boot mobile app with YouTube audio streaming.
Written from real pain points encountered during development.

---

## Authentication

### Use Firebase Auth, not Google OAuth directly
- Firebase Auth handles token verification, user management, and refresh logic out of the box.
- Direct Google OAuth (`google-api-client`) requires manual token verification and is harder to maintain.
- Firebase Admin SDK on backend: verify ID tokens with `FirebaseAuth.getInstance().verifyIdToken(token)`.
- Firebase UID is stable — use it as the user's primary key in your database.

### Google Sign-In on React Native
- Use `@react-native-google-signin/google-signin` — pin to `@13.1.0` if on Expo < 52 (latest requires Expo 52+).
- The `webClientId` must be the **Firebase project's web client ID**, not the Android client ID.
- SHA-1 fingerprint of the debug keystore **must** be registered in Firebase Console under Android app settings.
- `DEVELOPER_ERROR` almost always means wrong `webClientId` or missing SHA-1.
- After signing in with Google, pass the ID token to Firebase: `auth().signInWithCredential(GoogleAuthProvider.credential(idToken))`.

### JWT via query param for media endpoints
- ExoPlayer (and other media players) use their own HTTP client — they don't send custom headers.
- Pass JWT as a query param: `/api/songs/{id}/audio?token=xxx`.
- Validate it manually at the start of the endpoint.
- Mark the endpoint as `permitAll()` in Spring Security and validate manually inside the method.

### Spring Security loses context on async threads
- If you return `CompletableFuture` from a Spring controller, the security context is not propagated to the new thread.
- This causes 403s on async endpoints even with valid tokens.
- Fix: keep audio/stream endpoints synchronous — call `.get()` on the future inside the controller method.

---

## Backend — Spring Boot

### EC2 sizing
- `t2.micro` / `t3.micro` use CPU credits. yt-dlp exhausts them in minutes → instance becomes unresponsive.
- Minimum practical size for yt-dlp workloads: **t3.small**.
- Monitor CPU credit balance in CloudWatch if staying on burstable instances.

### Never block Tomcat threads with slow subprocesses
- Calling `Runtime.exec()` or `ProcessBuilder` directly in a request handler blocks a Tomcat thread for the full yt-dlp duration (~5-15s).
- With default 10 Tomcat threads, 10 simultaneous requests = server freeze.
- Fix: run subprocesses in a bounded `ExecutorService` (`Executors.newFixedThreadPool(2)`) and return a `CompletableFuture`.
- Add in-flight deduplication: `Map<String, CompletableFuture<T>>` so the same video doesn't spawn multiple yt-dlp processes.

### Java subprocess PATH inheritance
- Java subprocesses don't inherit the full shell PATH.
- If a CLI tool (yt-dlp, node, ffmpeg) is in `/usr/local/bin` or `/usr/bin`, the subprocess may not find it.
- Fix: explicitly set PATH in `ProcessBuilder.environment()`:
  ```java
  pb.environment().put("PATH", "/usr/local/bin:/usr/bin:/bin:" + existing);
  ```
- Or pass the full path to the binary directly.

### Authenticated HTTPS proxy in Java
- `HttpURLConnection` does not support authenticated HTTPS proxies out of the box.
- Fix requires system properties:
  ```java
  System.setProperty("https.proxyHost", host);
  System.setProperty("https.proxyPort", port);
  System.setProperty("https.proxyUser", user);
  System.setProperty("https.proxyPassword", pass);
  System.setProperty("jdk.http.auth.tunneling.disabledSchemes", "");
  ```
- Also set a global `Authenticator` to return credentials when challenged.

### Deployment — JAR location matters
- `mvn package` outputs to `target/` inside the project directory.
- The systemd service runs from a different path (e.g., `/home/ubuntu/`).
- Always copy after building: `cp target/app.jar ~/app.jar`.
- Or symlink once: `ln -sf ~/project/target/app.jar ~/app.jar`.
- **Common mistake**: rebuilding but forgetting to copy → old code keeps running.

---

## YouTube Audio Extraction (yt-dlp)

### Bot detection is the core challenge
- YouTube aggressively rate-limits and bot-detects unauthenticated requests from datacenter IPs.
- Symptoms: HTTP 429, "Sign in to confirm you're not a bot".
- Solutions in order of effectiveness:
  1. **Authenticated cookies** — most reliable, lasts months.
  2. **`--js-runtimes node:/usr/bin/node`** — required for solving the n-challenge (URL obfuscation).
  3. **Player client selection** — `tv_embedded`, `android_music` are less restricted than `web`.
  4. **Residential proxies** — datacenter proxies (Webshare shared) still get 429'd even with cookies.

### yt-dlp requires a JavaScript runtime
- Recent yt-dlp versions need Node.js or Deno to solve YouTube's "n challenge" (a URL parameter that prevents hotlinking).
- Install Node.js on the server: `sudo apt-get install -y nodejs`.
- Point yt-dlp at it explicitly: `--js-runtimes node:/usr/bin/node`.
- Without it: "n challenge solving failed" and no audio formats available.

### YouTube cookies — export and management
- Export from Chrome using "Get cookies.txt LOCALLY" extension (Netscape format).
- **Critical**: do NOT open or refresh YouTube in that browser after exporting — it rotates the session cookies immediately.
- Upload only YouTube/Google cookies to the server, not the full browser cookie export (which contains AWS credentials and other sensitive tokens).
- Session cookies (`__Secure-3PSID`, `SAPISID`, etc.) last **1-2 years** if you don't log out.
- Re-upload when you start seeing 500 errors again.

### OAuth2 is dead for yt-dlp
- `--username oauth2` was removed from yt-dlp. Don't try to automate this.
- Cookies are the only reliable auth method now.

### CDN URLs are IP-locked
- YouTube CDN URLs returned by yt-dlp are locked to the IP that fetched them.
- If yt-dlp fetches via a proxy, the CDN URL only works from that proxy's IP.
- If the phone tries to use the CDN URL directly → 403.
- Fix: stream audio through the backend proxy (`/api/songs/{id}/audio`), which pipes the CDN response to the phone.
- Store which proxy was used alongside the CDN URL so streaming uses the same proxy.
- If yt-dlp fetches via EC2's direct IP (with cookies), stream directly from EC2 — no proxy needed.

### Video duration limits
- Add server-side duration checks before yt-dlp to protect from accidentally processing 2-hour mixes.
- Filter long videos in YouTube search results too, or they show up in recommendations.
- 15 minutes (900s) is a safe cap for a music app.

---

## Streaming Architecture

### ExoPlayer already does chunked streaming
- expo-av / ExoPlayer automatically uses HTTP range requests when streaming from a URL.
- Playback starts immediately — the full file is NOT downloaded before playback begins.
- The perceived "loading delay" is yt-dlp resolving the URL, not audio download time.
- No extra implementation needed for chunk-based streaming.

### Cache on first play, stream until then
- On first play: stream via backend proxy URL → ExoPlayer starts instantly.
- Simultaneously: `FileSystem.downloadAsync()` caches the full file in background.
- On subsequent plays: use the local cached file → instant, no network needed.
- This gives offline support for free after the first listen.

### Cache TTL for CDN URLs
- YouTube CDN URLs expire (typically 6 hours).
- Cache them server-side with a TTL slightly less than expiry (90 minutes is safe).
- Use in-flight deduplication so concurrent requests for the same video share one yt-dlp process.

---

## React Native / Expo

### Background audio requires explicit configuration
- Set `Audio.setAudioModeAsync({ staysActiveInBackground: true, playsInSilentModeIOS: true })` once at module load.
- Do this outside the store/component, at the top level of the audio module.

### Zustand store + Audio.Sound
- Don't store `Audio.Sound` instances inside Zustand state — Zustand tries to serialize state, which breaks sound objects.
- Keep the sound instance in a module-level variable outside the store.
- Use a playback ID counter (`_playbackId`) to cancel stale async operations when the user skips quickly.

### Secure token storage
- Use `expo-secure-store` for JWT tokens, not AsyncStorage.
- AsyncStorage is unencrypted — never store auth tokens there.

### Google Services setup (Android)
- `google-services.json` must be in `android/app/`, not the project root.
- Add `classpath('com.google.gms:google-services:4.4.4')` to root `build.gradle`.
- Add `apply plugin: "com.google.gms.google-services"` to `android/app/build.gradle`.

---

## Database

### PostgreSQL user permissions after instance recreation
- Creating a new EC2 instance means a fresh PostgreSQL install.
- The app's DB user won't exist — create it and grant permissions:
  ```sql
  CREATE USER appuser WITH PASSWORD 'password';
  GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO appuser;
  GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO appuser;
  ```
- Don't rely on DB state surviving instance replacement.

### Firebase UID vs Google Sub
- Firebase UID for Google Sign-In equals the Google account's `sub` field.
- If you previously stored users by Google `sub` and switch to Firebase UID — they match, no migration needed.

---

## General DevOps

### Use systemd for the backend service
- `nohup java -jar ... &` dies on SSH disconnect or reboot.
- Use a systemd service file so the backend auto-starts and auto-restarts on failure.
- Check status: `sudo systemctl status appname`.
- View logs: `sudo journalctl -u appname -f`.

### Environment variables via systemd
- Don't `export` env vars in `.bashrc` for systemd services — systemd doesn't source it.
- Use `EnvironmentFile=/home/ubuntu/.env` in the service unit, or set `Environment=` directly in the unit file.

### Git-based deployment workflow
- Keep backend source on EC2 as a git clone.
- Deploy = `git pull && mvn package && cp jar ~/ && systemctl restart`.
- Never manually edit files on EC2 — changes get wiped on next pull.

### Sensitive files in git
- Never commit `serviceAccountKey.json`, `.env`, or cookie files.
- Add to `.gitignore`: `**/serviceAccountKey*.json`, `*.pem`, `cookies*.txt`.
- Upload sensitive files to EC2 via `scp` separately from git.
