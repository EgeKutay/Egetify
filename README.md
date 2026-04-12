# Egetify

Personal YouTube music streaming app for Android (Samsung S21FE).  
**Royal Blue** theme · React Native (Expo) frontend · Java Spring Boot backend · PostgreSQL.

---

## Before You Start — Required API Keys

You need **two** things from [Google Cloud Console](https://console.cloud.google.com/):

| What | Where to get it | Where to put it |
|------|-----------------|-----------------|
| **YouTube Data API v3 key** | APIs & Services → Credentials → API Key | `backend/src/main/resources/application.yml` → `app.youtube.api-key` |
| **Google OAuth 2.0 Web Client ID** | APIs & Services → Credentials → OAuth 2.0 Client (Web) | `backend/src/main/resources/application.yml` → `app.google.client-id` |
| **Google OAuth 2.0 Android Client ID** | APIs & Services → Credentials → OAuth 2.0 Client (Android) | `frontend/app.json` → `extra.googleWebClientId` |

> Enable these APIs in your project: **YouTube Data API v3**, **Google Identity**.

---

## Prerequisites

| Tool | Required version |
|------|-----------------|
| JDK | 21+ |
| Maven | 3.9+ |
| Node.js | 18+ |
| npm | 9+ |
| PostgreSQL | 14+ |
| Android Studio + emulator | Pixel / Galaxy profile, API 31+ |
| Expo CLI | Latest (`npm install -g expo-cli`) |

---

## Project Structure

```
Egetify/
├── backend/          ← Spring Boot Java API
│   ├── pom.xml
│   └── src/
│       ├── main/java/com/egetify/
│       │   ├── config/       (Security, YouTube, GlobalExceptionHandler)
│       │   ├── controller/   (Auth, Search, Playlist, History)
│       │   ├── dto/          (request/response objects)
│       │   ├── model/        (User, Song, Playlist, PlaylistSong, PlayHistory)
│       │   ├── repository/   (JPA repositories)
│       │   ├── security/     (JWT, UserPrincipal)
│       │   └── service/      (Auth, YouTube, Playlist, History, User)
│       └── test/             (Cucumber BDD feature files + step definitions)
│
└── frontend/         ← React Native / Expo
    ├── App.tsx
    ├── app.json
    └── src/
        ├── components/   (SongCard, MiniPlayer, SearchBar)
        ├── navigation/   (AppNavigator – stack + bottom tabs)
        ├── screens/      (Login, Home, Search, NowPlaying, Library, Playlist, Error)
        ├── services/     (api, authService, musicService, playlistService)
        ├── store/        (Zustand: authStore, playerStore, playlistStore)
        ├── theme/        (Royal Blue colour palette)
        └── types/        (TypeScript interfaces)
```

---

## 1  Set Up PostgreSQL

Run in PowerShell (requires psql on PATH):

```powershell
psql -U postgres -c "CREATE DATABASE egetify;"
```

Or create the database via pgAdmin / any GUI.

---

## 2  Configure API Keys

Open `backend\src\main\resources\application.yml` and replace the placeholders:

```yaml
app:
  youtube:
    api-key: YOUR_YOUTUBE_API_KEY          # <- paste here
  google:
    client-id: YOUR_GOOGLE_CLIENT_ID       # <- paste here
```

Open `frontend\app.json` and replace:

```json
"extra": {
  "googleWebClientId": "YOUR_GOOGLE_WEB_CLIENT_ID"
}
```

---

## 3  Run the Backend

```powershell
# Navigate to backend folder
cd backend

# Download Maven wrapper (first time only)
mvn -N io.takari:maven:wrapper

# Build and start (downloads all dependencies on first run, ~2 min)
.\mvnw.cmd spring-boot:run
```

The API will be available at `http://localhost:8080/api`

### Run backend tests (Cucumber BDD)

```powershell
cd backend
.\mvnw.cmd test
# HTML report saved to: backend\target\cucumber-report.html
```

---

## 4  Run the Frontend

```powershell
# Navigate to frontend folder
cd frontend

# Install dependencies (first time only, ~1-2 min)
npm install

# Start Expo dev server
npx expo start
```

Then press **`a`** in the Expo terminal to open on the **Android emulator**  
(make sure your emulator is already running in Android Studio).

> **Note:** The Android emulator routes `10.0.2.2` to your host machine.  
> The frontend is pre-configured to call `http://10.0.2.2:8080/api` — no changes needed for emulator.

### Run frontend tests

```powershell
cd frontend
npm test
```

---

## 5  Using a Physical Android Device (Samsung S21FE)

1. Enable **Developer Options** → **USB Debugging** on the phone
2. Connect via USB
3. Find your PC's local IP in PowerShell: `ipconfig` → IPv4 under your Wi-Fi adapter
4. Update `frontend\app.json`:
   ```json
   "extra": { "apiBaseUrl": "http://YOUR_PC_IP:8080/api" }
   ```
5. Run `npx expo start --android`

---

## 6  Environment Variables (optional — avoids editing yml directly)

```powershell
$env:YOUTUBE_API_KEY    = "your_youtube_api_key"
$env:GOOGLE_CLIENT_ID   = "your_google_client_id"
$env:DB_USERNAME        = "postgres"
$env:DB_PASSWORD        = "postgres"
$env:JWT_SECRET         = "a-long-random-secret-string"

cd backend
.\mvnw.cmd spring-boot:run
```

---

## 7  Deploy Backend to AWS EC2

```powershell
# 1. Build fat JAR
cd backend
.\mvnw.cmd clean package -DskipTests

# 2. Copy JAR to EC2
scp -i "your-key.pem" target\egetify-backend-0.0.1-SNAPSHOT.jar ec2-user@YOUR_EC2_IP:~/

# 3. SSH into EC2 and run
ssh -i "your-key.pem" ec2-user@YOUR_EC2_IP
java -jar egetify-backend-0.0.1-SNAPSHOT.jar `
  --spring.datasource.url=jdbc:postgresql://localhost:5432/egetify `
  --app.youtube.api-key=YOUR_KEY `
  --app.google.client-id=YOUR_CLIENT_ID
```

---

## API Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/google` | No | Exchange Google ID token for JWT |
| GET | `/api/search?q=...` | JWT | Search YouTube |
| GET | `/api/recommendations` | JWT | Recommendations based on last play |
| GET | `/api/songs/{videoId}` | JWT | Get song metadata |
| POST | `/api/history` | JWT | Record a song play |
| GET | `/api/history/recent` | JWT | Recently played songs |
| GET | `/api/playlists` | JWT | List user playlists |
| POST | `/api/playlists` | JWT | Create playlist |
| GET | `/api/playlists/{id}` | JWT | Get playlist detail + songs |
| DELETE | `/api/playlists/{id}` | JWT | Delete playlist |
| POST | `/api/playlists/{id}/songs` | JWT | Add song to playlist |
| DELETE | `/api/playlists/{id}/songs/{videoId}` | JWT | Remove song from playlist |

---

## Build Phases

- **Phase 1 (complete):** Google auth, YouTube search, basic player, home feed
- **Phase 2 (complete):** Playlist CRUD, auto-play next, YouTube recommendations
- **Phase 3 (complete):** Error screens, Cucumber BDD tests, connection error handling

---

## Known Limitations

- **Background audio:** The YouTube IFrame player (via `react-native-youtube-iframe`) may pause when the app is fully backgrounded on some Android versions due to WebView restrictions. This is a YouTube platform limitation for embedded players.
- **YouTube ToS:** This app is for personal, non-commercial use only as per YouTube's Terms of Service.
- **Daily quota:** YouTube Data API has a 10,000 unit/day limit. Search costs 100 units/call; metadata costs 1 unit/call. All results are cached in PostgreSQL to minimise usage.
