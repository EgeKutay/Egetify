import { create } from 'zustand';
import { Song, Playlist, RepeatMode, PlayerState } from '../types';
import { recordPlay } from '../services/musicService';

interface PlayerActions {
  playSong: (song: Song, queue?: Song[], playlist?: Playlist | null) => void;
  togglePlay: () => void;
  playNext: () => void;
  playPrevious: () => void;
  setRepeatMode: (mode: RepeatMode) => void;
  clearPlayer: () => void;
}

const initialState: PlayerState = {
  currentSong: null,
  queue: [],
  queueIndex: 0,
  isPlaying: false,
  repeatMode: 'none',
  playlistContext: null,
};

export const usePlayerStore = create<PlayerState & PlayerActions>((set, get) => ({
  ...initialState,

  /**
   * Start playing a song.
   * @param song     The song to play immediately.
   * @param queue    Optional queue (e.g. all songs in a playlist). Defaults to [song].
   * @param playlist The playlist context (for auto-next logic).
   */
  playSong: (song, queue = [], playlist = null) => {
    const fullQueue = queue.length > 0 ? queue : [song];
    const index = fullQueue.findIndex((s) => s.youtubeId === song.youtubeId);

    set({
      currentSong: song,
      queue: fullQueue,
      queueIndex: index >= 0 ? index : 0,
      isPlaying: true,
      playlistContext: playlist ?? null,
    });

    // Fire-and-forget – don't block the UI on this
    recordPlay(song.youtubeId).catch(() => {});
  },

  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),

  playNext: () => {
    const { queue, queueIndex, repeatMode } = get();
    if (queue.length === 0) return;

    let nextIndex: number;

    if (repeatMode === 'one') {
      nextIndex = queueIndex;
    } else if (queueIndex < queue.length - 1) {
      nextIndex = queueIndex + 1;
    } else if (repeatMode === 'all') {
      nextIndex = 0;
    } else {
      // End of queue – stop
      set({ isPlaying: false });
      return;
    }

    const nextSong = queue[nextIndex];
    set({ currentSong: nextSong, queueIndex: nextIndex, isPlaying: true });
    recordPlay(nextSong.youtubeId).catch(() => {});
  },

  playPrevious: () => {
    const { queue, queueIndex } = get();
    if (queue.length === 0 || queueIndex === 0) return;
    const prev = queue[queueIndex - 1];
    set({ currentSong: prev, queueIndex: queueIndex - 1, isPlaying: true });
    recordPlay(prev.youtubeId).catch(() => {});
  },

  setRepeatMode: (mode) => set({ repeatMode: mode }),

  clearPlayer: () => set(initialState),
}));
