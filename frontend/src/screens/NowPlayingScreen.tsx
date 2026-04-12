import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../theme/colors';
import { usePlayerStore } from '../store/playerStore';

const { width: SCREEN_W } = Dimensions.get('window');
const ART_SIZE = SCREEN_W - 56;

function formatMs(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

export default function NowPlayingScreen() {
  const navigation = useNavigation();
  const {
    currentSong,
    isPlaying,
    isLoading,
    queue,
    queueIndex,
    repeatMode,
    positionMs,
    durationMs,
    togglePlay,
    playNext,
    playPrevious,
    seekTo,
    setRepeatMode,
  } = usePlayerStore();

  const cycleRepeat = () => {
    const modes: Array<typeof repeatMode> = ['none', 'all', 'one'];
    setRepeatMode(modes[(modes.indexOf(repeatMode) + 1) % modes.length]);
  };

  const handleSeek = (value: number) => {
    seekTo(value).catch(() => {});
  };

  const handlePlayNext = () => {
    playNext().catch((e: Error) => {
      Alert.alert('Playback error', e.message);
    });
  };

  const handlePlayPrevious = () => {
    playPrevious().catch((e: Error) => {
      Alert.alert('Playback error', e.message);
    });
  };

  const handleToggle = () => {
    togglePlay().catch((e: Error) => {
      Alert.alert('Playback error', e.message);
    });
  };

  if (!currentSong) return null;

  const repeatColor = repeatMode !== 'none' ? Colors.primary : Colors.iconInactive;
  const hasPrev = queueIndex > 0;
  const hasNext = queueIndex < queue.length - 1 || repeatMode !== 'none';

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-down" size={28} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.contextLabel}>
          {queue.length > 1 ? `${queueIndex + 1} / ${queue.length}` : 'Now Playing'}
        </Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Album art */}
      <View style={styles.artContainer}>
        {currentSong.thumbnailUrl ? (
          <Image
            source={{ uri: currentSong.thumbnailUrl }}
            style={styles.art}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.art, styles.artPlaceholder]}>
            <Ionicons name="musical-notes" size={64} color={Colors.primary} />
          </View>
        )}
        {isLoading && (
          <View style={styles.artOverlay}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        )}
      </View>

      {/* Song info */}
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>
          {currentSong.title}
        </Text>
        <Text style={styles.artist} numberOfLines={1}>
          {currentSong.channelTitle}
        </Text>
      </View>

      {/* Progress bar */}
      <View style={styles.progressContainer}>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={durationMs || 1}
          value={positionMs}
          onSlidingComplete={handleSeek}
          minimumTrackTintColor={Colors.primary}
          maximumTrackTintColor={Colors.divider}
          thumbTintColor={Colors.primary}
          disabled={durationMs === 0}
        />
        <View style={styles.timeRow}>
          <Text style={styles.timeText}>{formatMs(positionMs)}</Text>
          <Text style={styles.timeText}>{formatMs(durationMs)}</Text>
        </View>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity
          onPress={handlePlayPrevious}
          disabled={!hasPrev}
          style={styles.controlBtn}
        >
          <Ionicons
            name="play-skip-back"
            size={32}
            color={hasPrev ? Colors.textPrimary : Colors.iconInactive}
          />
        </TouchableOpacity>

        <TouchableOpacity style={styles.playBtn} onPress={handleToggle} disabled={isLoading}>
          <LinearGradient
            colors={[Colors.primary, Colors.primaryDark]}
            style={styles.playBtnGradient}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Ionicons name={isPlaying ? 'pause' : 'play'} size={36} color="#fff" />
            )}
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handlePlayNext}
          disabled={!hasNext}
          style={styles.controlBtn}
        >
          <Ionicons
            name="play-skip-forward"
            size={32}
            color={hasNext ? Colors.textPrimary : Colors.iconInactive}
          />
        </TouchableOpacity>
      </View>

      {/* Repeat */}
      <View style={styles.extras}>
        <TouchableOpacity onPress={cycleRepeat} style={styles.extraBtn}>
          <Ionicons name="repeat-outline" size={22} color={repeatColor} />
          {repeatMode === 'one' && (
            <Text style={[styles.repeatBadge, { color: Colors.primary }]}>1</Text>
          )}
        </TouchableOpacity>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingTop: 8,
    marginBottom: 24,
  },
  backBtn: { padding: 4 },
  contextLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  artContainer: {
    width: ART_SIZE,
    height: ART_SIZE,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 32,
    backgroundColor: Colors.surfaceAlt,
    // Subtle shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  art: {
    width: '100%',
    height: '100%',
  },
  artPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  artOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  info: {
    width: '100%',
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  artist: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  progressContainer: {
    width: '100%',
    marginBottom: 8,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginTop: -4,
  },
  timeText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
    marginTop: 8,
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
    justifyContent: 'center',
    width: '100%',
  },
  extraBtn: {
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  repeatBadge: {
    fontSize: 10,
    fontWeight: '800',
    position: 'absolute',
    bottom: 2,
    right: 2,
  },
});
