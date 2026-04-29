import { create } from 'zustand';
import * as FileSystem from 'expo-file-system';
import { Playlist } from '../types';
import * as playlistService from '../services/playlistService';

const PLAYLISTS_CACHE = FileSystem.documentDirectory + '_playlists.json';

async function savePlaylistsLocally(playlists: Playlist[]) {
  try {
    await FileSystem.writeAsStringAsync(PLAYLISTS_CACHE, JSON.stringify(playlists));
  } catch {}
}

async function loadPlaylistsLocally(): Promise<Playlist[] | null> {
  try {
    const { exists } = await FileSystem.getInfoAsync(PLAYLISTS_CACHE);
    if (!exists) return null;
    const raw = await FileSystem.readAsStringAsync(PLAYLISTS_CACHE);
    return JSON.parse(raw) as Playlist[];
  } catch {
    return null;
  }
}

interface PlaylistStore {
  playlists: Playlist[];
  isLoading: boolean;
  error: string | null;

  fetchPlaylists: () => Promise<void>;
  createPlaylist: (name: string, description?: string) => Promise<Playlist>;
  deletePlaylist: (id: number) => Promise<void>;
  addSong: (playlistId: number, youtubeId: string) => Promise<void>;
  removeSong: (playlistId: number, youtubeId: string) => Promise<void>;
  clearError: () => void;
}

export const usePlaylistStore = create<PlaylistStore>((set, get) => ({
  playlists: [],
  isLoading: false,
  error: null,

  fetchPlaylists: async () => {
    set({ isLoading: true, error: null });
    try {
      const playlists = await playlistService.getPlaylists();
      set({ playlists, isLoading: false });
      savePlaylistsLocally(playlists);
    } catch {
      const cached = await loadPlaylistsLocally();
      if (cached) {
        set({ playlists: cached, isLoading: false });
      } else {
        set({ error: 'No internet connection and no cached data', isLoading: false });
      }
    }
  },

  createPlaylist: async (name, description) => {
    const created = await playlistService.createPlaylist(name, description);
    const next = [created, ...get().playlists];
    set({ playlists: next });
    savePlaylistsLocally(next);
    return created;
  },

  deletePlaylist: async (id) => {
    await playlistService.deletePlaylist(id);
    const next = get().playlists.filter((p) => p.id !== id);
    set({ playlists: next });
    savePlaylistsLocally(next);
  },

  addSong: async (playlistId, youtubeId) => {
    const updated = await playlistService.addSongToPlaylist(playlistId, youtubeId);
    const next = get().playlists.map((p) => (p.id === playlistId ? updated : p));
    set({ playlists: next });
    savePlaylistsLocally(next);
  },

  removeSong: async (playlistId, youtubeId) => {
    const updated = await playlistService.removeSongFromPlaylist(playlistId, youtubeId);
    const next = get().playlists.map((p) => (p.id === playlistId ? updated : p));
    set({ playlists: next });
    savePlaylistsLocally(next);
  },

  clearError: () => set({ error: null }),
}));
