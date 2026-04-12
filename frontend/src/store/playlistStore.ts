import { create } from 'zustand';
import { Playlist } from '../types';
import * as playlistService from '../services/playlistService';

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
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  createPlaylist: async (name, description) => {
    const created = await playlistService.createPlaylist(name, description);
    set((state) => ({ playlists: [created, ...state.playlists] }));
    return created;
  },

  deletePlaylist: async (id) => {
    await playlistService.deletePlaylist(id);
    set((state) => ({ playlists: state.playlists.filter((p) => p.id !== id) }));
  },

  addSong: async (playlistId, youtubeId) => {
    const updated = await playlistService.addSongToPlaylist(playlistId, youtubeId);
    set((state) => ({
      playlists: state.playlists.map((p) => (p.id === playlistId ? updated : p)),
    }));
  },

  removeSong: async (playlistId, youtubeId) => {
    const updated = await playlistService.removeSongFromPlaylist(playlistId, youtubeId);
    set((state) => ({
      playlists: state.playlists.map((p) => (p.id === playlistId ? updated : p)),
    }));
  },

  clearError: () => set({ error: null }),
}));
