# App project prompt template

## 1. What I'm building

## A personal, non-commercial music streaming app (Android) for Samsung S21FE that uses YouTube as its music source. I can search, play, create playlists, and get recommendations. For my use only

## 2. Core features

> As a user I want to use this music app on mobile phone (android preferably)
> As a user I want to search for music over the internet.
> As a user I want to get recommendations using Youtube recommendation algorithm.
> As a user I want to play and pause music functionality as same as spotify when I click on a music.
> As a user I want to create play list and add music to them. After addition I want able to delete or remove from the playlist.
> As a user I want to login with my google account.
> As a user whenever a music ends I want next music to play automatically in playlist. If the music is not in the any play list then next recommended music should be played.
> As a user music should continue playing when the app is minimized or screen is locked.
> As a user I want to see error screen when connection or video can't load.

---

## 3. User roles

> Listener — browse, search, play music, manage playlists

---

## 4. Key screens / pages

> - Home feed (recommended, recently played)
> - Search / explore page
> - Now playing (full-screen player)
> - Library (playlists, liked songs, artists)
> - Settings / account page

---

## 5. Tech stack

> - Frontend: ReactNative
> - Backend: Java
> - Database: PostgreSQL to save playlists and user info and musics thats been played before, use the YouTube Data API for search, metadata, and recommendations, and use an embedded YouTube player for playback
> - Auth: JWT, Google Login
> - Platform: Mobile phone; android first.
> - Deploy platform: this app's backend will be deployed to AWS EC2

---

## 6. Build phases

> - Phase 1 (MVP): user auth, song browsing, basic player,
> - Phase 2: playlist CRUD , auto music play
> - Phase3: automated tests, error handling

---

## 7. What I need from you

> Your answer:
> Path: C:\Users\Decard\Desktop\ClaudeProjects\Egetify
> Start off with porject folder structure where front-end and backend seperated as folders.
> Build each feature one by one.
> use clear file names and comments.
> Give me working code I can run and simulate anroid app locally
> Cache search results and metadata in PostgreSQL to minimize YouTube API calls (10,000 unit daily limit)
> User stories I provided must be tested by BDD and all test must pass
> Give me commands to run in read me file in for powershell.
> I already created repo for the project, create front-end and backend-folder to implement features

## 8. Reference / inspiration (optional)

> while not music play and on the playlist: https://storage.googleapis.com/pr-newsroom-wp/1/2021/05/Playlist-RR.png
> while music playing: https://www.reddit.com/media?url=https%3A%2F%2Fi.redd.it%2Fnow-playing-ui-which-better-v0-fi68a63zagkb1.jpg%3Fwidth%3D1840%26format%3Dpjpg%26auto%3Dwebp%26s%3Dabb09d729101db58fea4b6b8b1602fac6a683872

---

## 9. Constraints (optional)

> Much like spotify green theme, this application theme must be blue instead green (Royal Blue).
> Buttons must be functional meaning every button should work as Intented.
> When one dependency is missing or causing problems let me know instead of trying to figure out by yourself.
> if you need authorization such as API key from google let me know.
