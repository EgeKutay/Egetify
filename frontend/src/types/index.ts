// ── Domain types ─────────────────────────────────────────────────────────────

export interface Song {
  youtubeId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  durationFormatted: string;
  genre?: string;
}

export interface Playlist {
  id: number;
  name: string;
  description?: string;
  thumbnailUrl?: string;
  songCount: number;
  songs?: Song[];
}

export interface User {
  id: number;
  email: string;
  name: string;
  pictureUrl?: string;
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export interface AuthResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  user: User;
}

// ── Player state ──────────────────────────────────────────────────────────────

export type RepeatMode = 'none' | 'all' | 'one';

export interface PlayerState {
  currentSong: Song | null;
  queue: Song[];
  queueIndex: number;
  isPlaying: boolean;
  isLoading: boolean;
  repeatMode: RepeatMode;
  playlistContext: Playlist | null;
  positionMs: number;
  durationMs: number;
}

// ── Navigation ────────────────────────────────────────────────────────────────

export type RootStackParamList = {
  Login: undefined;
  Main: undefined;
  NowPlaying: undefined;
  Playlist: { playlistId: number };
  Cache: undefined;
  Error: { message: string };
};

export type MainTabParamList = {
  Home: undefined;
  Search: undefined;
  Library: undefined;
};
