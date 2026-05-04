# Egetify

Personal YouTube music streaming app for Android.  
**Royal Blue** theme · React Native (Expo) frontend · Java Spring Boot backend · PostgreSQL.

---

## Before You Start — Required API Keys

Get these from [Google Cloud Console](https://console.cloud.google.com/) (enable **YouTube Data API v3** and **Google Identity**):

---

## Prerequisites

| Tool | Required version | 
|------|-----------------|
| JDK | 17+ |
| Maven | 3.8+ |
| Node.js | 18+ |
| PostgreSQL | 14+ | 
| Android Studio + emulator | API 31+ |

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
