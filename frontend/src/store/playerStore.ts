import { create } from "zustand";
import { Audio, AVPlaybackStatus } from "expo-av";
import * as FileSystem from "expo-file-system";
import * as SecureStore from "expo-secure-store";
import { Song, Playlist, RepeatMode, PlayerState } from "../types";
import { recordPlay } from "../services/musicService";

declare const process: { env: Record<string, string | undefined> };
const API_BASE = (process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://10.0.2.2:8080/api").replace(/\/$/, "");

// Enable background audio + lock-screen controls once at module load
Audio.setAudioModeAsync({
  allowsRecordingIOS: false,
  playsInSilentModeIOS: true,
  staysActiveInBackground: true,
  shouldDuckAndroid: false,
  playThroughEarpieceAndroid: false,
}).catch(() => {});

interface PlayerActions {
  playSong: (
    song: Song,
    queue?: Song[],
    playlist?: Playlist | null,
  ) => Promise<void>;
  togglePlay: () => Promise<void>;
  playNext: () => Promise<void>;
  playPrevious: () => Promise<void>;
  seekTo: (positionMs: number) => Promise<void>;
  setRepeatMode: (mode: RepeatMode) => void;
  clearPlayer: () => Promise<void>;
}

const initialState: PlayerState = {
  currentSong: null,
  queue: [],
  queueIndex: 0,
  isPlaying: false,
  isLoading: false,
  repeatMode: "none",
  playlistContext: null,
  positionMs: 0,
  durationMs: 0,
};

export const METADATA_PATH = FileSystem.cacheDirectory + "_metadata.json";

async function saveSongMetadata(song: Song) {
  try {
    let metadata: Record<string, { title: string; channelTitle: string }> = {};
    const { exists } = await FileSystem.getInfoAsync(METADATA_PATH);
    if (exists) {
      const raw = await FileSystem.readAsStringAsync(METADATA_PATH);
      metadata = JSON.parse(raw);
    }
    metadata[song.youtubeId] = { title: song.title, channelTitle: song.channelTitle };
    await FileSystem.writeAsStringAsync(METADATA_PATH, JSON.stringify(metadata));
  } catch {}
}

// Sound instance lives outside the store so Zustand doesn't serialize it
let _sound: Audio.Sound | null = null;
let _playbackId = 0;

async function unloadCurrent() {
  if (_sound) {
    try {
      await _sound.unloadAsync();
    } catch (_) {}
    _sound = null;
  }
}

export const usePlayerStore = create<PlayerState & PlayerActions>(
  (set, get) => ({
    ...initialState,

    playSong: async (song, queue = [], playlist = null) => {
      const myId = ++_playbackId;
      const fullQueue = queue.length > 0 ? queue : [song];
      const index = fullQueue.findIndex((s) => s.youtubeId === song.youtubeId);

      set({
        currentSong: song,
        queue: fullQueue,
        queueIndex: index >= 0 ? index : 0,
        playlistContext: playlist ?? null,
        isLoading: true,
        positionMs: 0,
        durationMs: 0,
      });

      recordPlay(song.youtubeId).catch(() => {});

      await unloadCurrent();

      const localPath = FileSystem.cacheDirectory + song.youtubeId + ".audio";
      try {
        const { exists } = await FileSystem.getInfoAsync(localPath);

        let audioUri: string;
        if (exists) {
          audioUri = localPath;
        } else {
          const token = await SecureStore.getItemAsync("access_token");
          const proxyUrl = `${API_BASE}/songs/${song.youtubeId}/audio?token=${token ?? ""}`;
          if (myId !== _playbackId) return;
          audioUri = proxyUrl;
          // Cache in background for future plays
          FileSystem.downloadAsync(proxyUrl, localPath)
            .then(() => saveSongMetadata(song))
            .catch(() => {});
        }

        const { sound } = await Audio.Sound.createAsync(
          { uri: audioUri },
          { shouldPlay: true, progressUpdateIntervalMillis: 500 },
          (status: AVPlaybackStatus) => {
            if (!status.isLoaded) return;
            set({
              positionMs: status.positionMillis ?? 0,
              durationMs: status.durationMillis ?? 0,
              isPlaying: status.isPlaying,
            });
            if (status.didJustFinish) {
              get().playNext();
            }
          },
        );

        if (myId !== _playbackId) {
          await sound.unloadAsync();
          return;
        }

        _sound = sound;
        set({ isLoading: false, isPlaying: true });
      } catch (e) {
        // Delete the cached file so next tap forces a fresh download
        await FileSystem.deleteAsync(localPath, { idempotent: true }).catch(() => {});
        if (myId === _playbackId) {
          set({ isLoading: false, isPlaying: false });
          throw e;
        }
      }
    },

    togglePlay: async () => {
      if (!_sound) return;
      const { isPlaying } = get();
      if (isPlaying) {
        await _sound.pauseAsync();
      } else {
        await _sound.playAsync();
      }
    },

    playNext: async () => {
      const { queue, queueIndex, repeatMode } = get();
      if (queue.length === 0) return;

      let nextIndex: number;
      if (repeatMode === "one") {
        nextIndex = queueIndex;
      } else if (queueIndex < queue.length - 1) {
        nextIndex = queueIndex + 1;
      } else if (repeatMode === "all") {
        nextIndex = 0;
      } else {
        set({ isPlaying: false });
        return;
      }

      const nextSong = queue[nextIndex];
      set({ currentSong: nextSong, queueIndex: nextIndex });
      await get().playSong(nextSong, queue, get().playlistContext);
    },

    playPrevious: async () => {
      const { queue, queueIndex, positionMs } = get();
      if (queue.length === 0) return;

      // If more than 3 s in, restart the current song
      if (positionMs > 3000 && _sound) {
        await _sound.setPositionAsync(0);
        return;
      }

      if (queueIndex === 0) return;
      const prev = queue[queueIndex - 1];
      await get().playSong(prev, queue, get().playlistContext);
    },

    seekTo: async (positionMs: number) => {
      if (_sound) {
        await _sound.setPositionAsync(positionMs);
      }
    },

    setRepeatMode: (mode) => set({ repeatMode: mode }),

    clearPlayer: async () => {
      await unloadCurrent();
      set(initialState);
    },
  }),
);
