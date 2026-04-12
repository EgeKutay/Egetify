# Egetify

Personal YouTube music streaming app for Android (Samsung S21FE).  
**Royal Blue** theme · React Native (Expo) frontend · Java Spring Boot backend · PostgreSQL.

---

## Before You Start — Required API Keys

Get these from [Google Cloud Console](https://console.cloud.google.com/) (enable **YouTube Data API v3** and **Google Identity**):

| What | Where to put it |
|------|-----------------|
| **YouTube Data API v3 key** | `backend/src/main/resources/application-local.yml` → `app.youtube.api-key` |
| **Google OAuth 2.0 Web Client ID** | `backend/src/main/resources/application-local.yml` → `app.google.client-id` |
| **Google OAuth 2.0 Android Client ID** | `frontend/.env` → `EXPO_PUBLIC_GOOGLE_CLIENT_ID` |

---

## Prerequisites

| Tool | Required version | Your version |
|------|-----------------|--------------|
| JDK | 17+ | ✅ 17 |
| Maven | 3.8+ | ✅ 3.8.3 |
| Node.js | 18+ | ✅ 22 |
| PostgreSQL | 14+ | ⚠️ Install needed |
| Android Studio + emulator | API 31+ | — |

### Install PostgreSQL

Download from [postgresql.org/download/windows](https://www.postgresql.org/download/windows/)  
Default port `5432`, set a password for the `postgres` user during install.

Then create the database — open **pgAdmin** or run in PowerShell:

```powershell
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -c "CREATE DATABASE egetify;"
```

---

## Project Structure

```
Egetify/
├── backend/          ← Spring Boot Java API (port 8080)
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
    ├── app.json          (gitignored — contains client ID)
    ├── .env              (gitignored — contains client ID)
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

## 1  Fill in API Keys

Open `backend\src\main\resources\application-local.yml`:

```yaml
app:
  youtube:
    api-key: YOUR_YOUTUBE_API_KEY        # <- paste here
  google:
    client-id: YOUR_GOOGLE_WEB_CLIENT_ID # <- paste here
```

`frontend\.env` is already populated with your Android Client ID.  
If you need to change it:

```
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your_android_client_id.apps.googleusercontent.com
```

---

## 2  Run the Backend

```powershell
cd backend

# First run downloads all dependencies (~2 min)
mvn spring-boot:run -Dspring-boot.run.profiles=local
```

The API will be available at `http://localhost:8080/api`

### Run backend tests (Cucumber BDD)

```powershell
cd backend
mvn test
# HTML report: backend\target\cucumber-report.html
```

---

## 3  Run the Frontend

```powershell
cd frontend

# Install dependencies (first time only, ~1-2 min)
npm install

# Start Expo dev server
npx expo start
```

Then press **`a`** in the Expo terminal to open on the Android emulator  
(make sure your emulator is already running in Android Studio first).

> The Android emulator routes `10.0.2.2` → your host machine.  
> The frontend is pre-configured to call `http://10.0.2.2:8080/api` — no changes needed.

### Run frontend tests

```powershell
cd frontend
npm test
```

---

## 4  Using a Physical Android Device (Samsung S21FE)

1. Enable **Developer Options** → **USB Debugging** on the phone
2. Connect via USB
3. Find your PC's local IP: run `ipconfig` in PowerShell → IPv4 under Wi-Fi adapter
4. Edit `frontend\.env`:
   ```
   EXPO_PUBLIC_API_BASE_URL=http://YOUR_PC_IP:8080/api
   ```
5. Run `npx expo start --android`

---

## 5  Deploy Backend to AWS EC2

```powershell
# 1. Build fat JAR
cd backend
mvn clean package -DskipTests

# 2. Copy to EC2
scp -i "your-key.pem" target\egetify-backend-0.0.1-SNAPSHOT.jar ec2-user@YOUR_EC2_IP:~/

# 3. SSH and run
ssh -i "your-key.pem" ec2-user@YOUR_EC2_IP
java -jar egetify-backend-0.0.1-SNAPSHOT.jar `
  --spring.profiles.active=local `
  --app.youtube.api-key=YOUR_KEY `
  --app.google.client-id=YOUR_CLIENT_ID `
  --spring.datasource.password=YOUR_DB_PASSWORD
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

## Known Limitations

- **Background audio:** The YouTube IFrame player may pause when fully backgrounded on Android due to WebView restrictions — a YouTube platform limitation for embedded players.
- **YouTube ToS:** Personal, non-commercial use only.
- **Daily quota:** YouTube Data API allows 10,000 units/day. Search = 100 units/call, metadata = 1 unit/call. All results cached in PostgreSQL.
