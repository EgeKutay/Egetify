import api from './api';
import { Playlist } from '../types';

export async function getPlaylists(): Promise<Playlist[]> {
  const response = await api.get<Playlist[]>('/playlists');
  return response.data;
}

export async function createPlaylist(name: string, description?: string): Promise<Playlist> {
  const response = await api.post<Playlist>('/playlists', { name, description });
  return response.data;
}

export async function getPlaylistDetail(playlistId: number): Promise<Playlist> {
  const response = await api.get<Playlist>(`/playlists/${playlistId}`);
  return response.data;
}

export async function deletePlaylist(playlistId: number): Promise<void> {
  await api.delete(`/playlists/${playlistId}`);
}

export async function addSongToPlaylist(playlistId: number, youtubeId: string): Promise<Playlist> {
  const response = await api.post<Playlist>(`/playlists/${playlistId}/songs`, { youtubeId });
  return response.data;
}

export async function removeSongFromPlaylist(
  playlistId: number,
  youtubeId: string,
): Promise<Playlist> {
  const response = await api.delete<Playlist>(`/playlists/${playlistId}/songs/${youtubeId}`);
  return response.data;
}
