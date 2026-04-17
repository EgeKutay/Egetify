import api from './api';
import { Song } from '../types';

/** Search YouTube for music */
export async function searchMusic(query: string): Promise<Song[]> {
  const response = await api.get<Song[]>('/search', { params: { q: query } });
  return response.data;
}

/** Get recommendations based on last-played song */
export async function getRecommendations(): Promise<Song[]> {
  const response = await api.get<Song[]>('/recommendations');
  return response.data;
}

/** Fetch metadata for a single YouTube video */
export async function getSongDetails(videoId: string): Promise<Song> {
  const response = await api.get<Song>(`/songs/${videoId}`);
  return response.data;
}

/** Fetch a direct audio stream URL via the backend's Invidious proxy */
export async function getStreamUrl(youtubeId: string): Promise<string> {
  const response = await api.get<{ url: string }>(`/songs/${youtubeId}/stream`, { timeout: 60000 });
  return response.data.url;
}

/** Notify backend that a song started playing (updates history + feeds recommendations) */
export async function recordPlay(youtubeId: string): Promise<void> {
  await api.post('/history', { youtubeId });
}

/** Get recently played songs for home feed */
export async function getRecentlyPlayed(): Promise<Song[]> {
  const response = await api.get<Song[]>('/history/recent');
  return response.data;
}
