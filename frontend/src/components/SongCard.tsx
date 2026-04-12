import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { Colors } from '../theme/colors';
import { Song } from '../types';

interface Props {
  song: Song;
  onPress: () => void;
  /** Optional element rendered to the right of the song info (e.g. remove button) */
  rightAction?: React.ReactNode;
  /** Pass width-limiting styles for horizontal scroll cards */
  style?: ViewStyle;
  /** Compact vertical layout for horizontal carousels */
  horizontal?: boolean;
}

export default function SongCard({ song, onPress, rightAction, style, horizontal }: Props) {
  if (horizontal) {
    return (
      <TouchableOpacity
        style={[styles.horizontalCard, style]}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <Image
          source={{ uri: song.thumbnailUrl }}
          style={styles.horizontalThumb}
        />
        <Text style={styles.horizontalTitle} numberOfLines={2}>
          {song.title}
        </Text>
        <Text style={styles.horizontalArtist} numberOfLines={1}>
          {song.channelTitle}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.8}>
      <Image source={{ uri: song.thumbnailUrl }} style={styles.thumb} />
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>
          {song.title}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {song.channelTitle}
          {song.durationFormatted ? `  ·  ${song.durationFormatted}` : ''}
        </Text>
      </View>
      {rightAction && <View style={styles.rightAction}>{rightAction}</View>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // ── List row ──────────────────────────────────────────────────────────────
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
    gap: 12,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: Colors.surfaceAlt,
  },
  info: { flex: 1 },
  title: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  meta: { fontSize: 13, color: Colors.textSecondary, marginTop: 3 },
  rightAction: { paddingLeft: 8 },

  // ── Horizontal card ───────────────────────────────────────────────────────
  horizontalCard: { width: 150 },
  horizontalThumb: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 10,
    backgroundColor: Colors.surfaceAlt,
  },
  horizontalTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginTop: 6,
  },
  horizontalArtist: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
