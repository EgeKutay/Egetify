import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { usePlayerStore } from '../store/playerStore';

interface Props {
  onPress: () => void;
}

/**
 * Persistent mini player shown at the bottom of each main tab screen.
 * Tapping it opens the full NowPlaying modal.
 */
export default function MiniPlayer({ onPress }: Props) {
  const { currentSong, isPlaying, togglePlay, playNext } = usePlayerStore();

  if (!currentSong) return null;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.92}
    >
      <Image source={{ uri: currentSong.thumbnailUrl }} style={styles.thumb} />

      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>
          {currentSong.title}
        </Text>
        <Text style={styles.artist} numberOfLines={1}>
          {currentSong.channelTitle}
        </Text>
      </View>

      {/* Play / Pause */}
      <TouchableOpacity
        onPress={(e) => { e.stopPropagation(); togglePlay(); }}
        style={styles.btn}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons
          name={isPlaying ? 'pause' : 'play'}
          size={26}
          color={Colors.textPrimary}
        />
      </TouchableOpacity>

      {/* Skip next */}
      <TouchableOpacity
        onPress={(e) => { e.stopPropagation(); playNext(); }}
        style={styles.btn}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="play-skip-forward" size={24} color={Colors.textPrimary} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 68,
    backgroundColor: Colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    gap: 10,
    // Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
  thumb: {
    width: 46,
    height: 46,
    borderRadius: 6,
    backgroundColor: Colors.surfaceAlt,
  },
  info: { flex: 1 },
  title: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  artist: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  btn: { padding: 4 },
});
