import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import YoutubePlayer, { YoutubeIframeRef } from 'react-native-youtube-iframe';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../theme/colors';
import { usePlayerStore } from '../store/playerStore';
import { getRecommendations } from '../services/musicService';

const { width: SCREEN_W } = Dimensions.get('window');

export default function NowPlayingScreen() {
  const navigation = useNavigation();
  const {
    currentSong,
    isPlaying,
    queue,
    queueIndex,
    repeatMode,
    togglePlay,
    playNext,
    playPrevious,
    setRepeatMode,
    playSong,
  } = usePlayerStore();

  const playerRef = useRef<YoutubeIframeRef>(null);
  const [playerError, setPlayerError] = useState(false);

  const handlePlayerError = useCallback(() => {
    setPlayerError(true);
    Alert.alert(
      'Playback Error',
      'This video could not be loaded. It may be unavailable or restricted.',
      [{ text: 'OK', onPress: () => navigation.goBack() }],
    );
  }, [navigation]);

  /** Auto-play next track when the current one ends */
  const handleStateChange = useCallback(
    async (state: string) => {
      if (state === 'ended') {
        if (queue.length > 0) {
          playNext();
        } else {
          // No queue – load YouTube recommendations for this song
          try {
            const recs = await getRecommendations();
            if (recs.length > 0) {
              playSong(recs[0], recs, null);
            }
          } catch (_) {
            // ignore – just stop playing
          }
        }
      }
    },
    [playNext, playSong, queue],
  );

  const cycleRepeat = () => {
    const modes = ['none', 'all', 'one'] as const;
    const next = modes[(modes.indexOf(repeatMode) + 1) % modes.length];
    setRepeatMode(next);
  };

  const repeatIcon = () => {
    if (repeatMode === 'one') return 'repeat-outline';
    return 'repeat-outline';
  };

  const repeatColor = () => {
    if (repeatMode === 'none') return Colors.iconInactive;
    return Colors.primary;
  };

  if (!currentSong) return null;

  return (
    <SafeAreaView style={styles.container}>
      {/* Back button */}
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Ionicons name="chevron-down" size={28} color={Colors.textPrimary} />
      </TouchableOpacity>

      <Text style={styles.contextLabel}>
        {queue.length > 1 ? `Playing from queue` : 'Now Playing'}
      </Text>

      {/* YouTube Player (hidden – audio only UX) */}
      {!playerError && (
        <View style={styles.playerWrapper}>
          <YoutubePlayer
            ref={playerRef}
            height={SCREEN_W * 0.56}
            width={SCREEN_W - 40}
            videoId={currentSong.youtubeId}
            play={isPlaying}
            onChangeState={handleStateChange}
            onError={handlePlayerError}
            webViewProps={{
              allowsInlineMediaPlayback: true,
              mediaPlaybackRequiresUserAction: false,
            }}
          />
        </View>
      )}

      {/* Album art fallback (thumbnail) */}
      <Image
        source={{ uri: currentSong.thumbnailUrl }}
        style={styles.thumbnail}
        resizeMode="cover"
      />

      {/* Song info */}
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>
          {currentSong.title}
        </Text>
        <Text style={styles.artist} numberOfLines={1}>
          {currentSong.channelTitle}
        </Text>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        {/* Previous */}
        <TouchableOpacity
          onPress={playPrevious}
          disabled={queueIndex === 0}
          style={styles.controlBtn}
        >
          <Ionicons
            name="play-skip-back"
            size={32}
            color={queueIndex === 0 ? Colors.iconInactive : Colors.textPrimary}
          />
        </TouchableOpacity>

        {/* Play / Pause */}
        <TouchableOpacity style={styles.playBtn} onPress={togglePlay}>
          <LinearGradient
            colors={[Colors.primary, Colors.primaryDark]}
            style={styles.playBtnGradient}
          >
            <Ionicons
              name={isPlaying ? 'pause' : 'play'}
              size={36}
              color="#fff"
            />
          </LinearGradient>
        </TouchableOpacity>

        {/* Next */}
        <TouchableOpacity onPress={playNext} style={styles.controlBtn}>
          <Ionicons name="play-skip-forward" size={32} color={Colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Repeat + Queue position */}
      <View style={styles.extras}>
        <TouchableOpacity onPress={cycleRepeat} style={styles.extraBtn}>
          <Ionicons name={repeatIcon()} size={22} color={repeatColor()} />
          {repeatMode === 'one' && (
            <Text style={[styles.repeatBadge, { color: Colors.primary }]}>1</Text>
          )}
        </TouchableOpacity>

        {queue.length > 1 && (
          <Text style={styles.queuePos}>
            {queueIndex + 1} / {queue.length}
          </Text>
        )}

        <View style={styles.extraBtn} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.playerBg,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  backBtn: {
    alignSelf: 'flex-start',
    paddingTop: 8,
    paddingBottom: 4,
  },
  contextLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 20,
  },
  playerWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
  },
  thumbnail: {
    width: SCREEN_W - 40,
    height: (SCREEN_W - 40) * 0.56,
    borderRadius: 12,
    marginBottom: 8,
    // Only shown when player is not rendering
    position: 'absolute',
    top: 100,
    zIndex: -1,
  },
  info: {
    width: '100%',
    marginTop: 24,
    marginBottom: 32,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  artist: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginTop: 6,
    textAlign: 'center',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 28,
    marginBottom: 24,
  },
  controlBtn: { padding: 8 },
  playBtn: { padding: 4 },
  playBtnGradient: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  extras: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 12,
  },
  extraBtn: { padding: 8, width: 44, alignItems: 'center' },
  repeatBadge: {
    fontSize: 10,
    fontWeight: '800',
    position: 'absolute',
    bottom: 4,
    right: 4,
  },
  queuePos: {
    fontSize: 13,
    color: Colors.textMuted,
  },
});
