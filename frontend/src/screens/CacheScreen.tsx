import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { METADATA_PATH } from '../store/playerStore';

interface CachedSong {
  youtubeId: string;
  title: string;
  channelTitle: string;
  sizeBytes: number;
  path: string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export default function CacheScreen() {
  const navigation = useNavigation();
  const [songs, setSongs] = useState<CachedSong[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalSize, setTotalSize] = useState(0);

  const loadCache = useCallback(async () => {
    setLoading(true);
    try {
      let metadata: Record<string, { title: string; channelTitle: string }> = {};
      const { exists } = await FileSystem.getInfoAsync(METADATA_PATH);
      if (exists) {
        const raw = await FileSystem.readAsStringAsync(METADATA_PATH);
        metadata = JSON.parse(raw);
      }

      const dir = FileSystem.cacheDirectory!;
      const files = await FileSystem.readDirectoryAsync(dir);
      const audioFiles = files.filter(f => f.endsWith('.m4a'));

      const entries: CachedSong[] = [];
      for (const file of audioFiles) {
        const youtubeId = file.replace('.m4a', '');
        const path = dir + file;
        const info = await FileSystem.getInfoAsync(path, { size: true });
        const sizeBytes = (info as any).size ?? 0;
        const meta = metadata[youtubeId];
        entries.push({
          youtubeId,
          title: meta?.title ?? youtubeId,
          channelTitle: meta?.channelTitle ?? '',
          sizeBytes,
          path,
        });
      }

      entries.sort((a, b) => b.sizeBytes - a.sizeBytes);
      setSongs(entries);
      setTotalSize(entries.reduce((acc, s) => acc + s.sizeBytes, 0));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadCache(); }, [loadCache]);

  const deleteOne = (song: CachedSong) => {
    Alert.alert('Delete', `Remove "${song.title}" from cache?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          await FileSystem.deleteAsync(song.path, { idempotent: true });
          setSongs(prev => prev.filter(s => s.youtubeId !== song.youtubeId));
          setTotalSize(prev => prev - song.sizeBytes);
        },
      },
    ]);
  };

  const clearAll = () => {
    if (songs.length === 0) return;
    Alert.alert('Clear All', `Delete all ${songs.length} cached songs?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear All', style: 'destructive', onPress: async () => {
          await Promise.all(songs.map(s => FileSystem.deleteAsync(s.path, { idempotent: true })));
          await FileSystem.deleteAsync(METADATA_PATH, { idempotent: true }).catch(() => {});
          setSongs([]);
          setTotalSize(0);
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={26} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cached Music</Text>
        <TouchableOpacity onPress={clearAll} style={styles.clearBtn} disabled={songs.length === 0}>
          <Text style={[styles.clearText, songs.length === 0 && styles.clearDisabled]}>
            Clear All
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={Colors.primary} />
      ) : songs.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="musical-notes-outline" size={56} color={Colors.iconInactive} />
          <Text style={styles.emptyText}>No cached songs</Text>
          <Text style={styles.emptySubtext}>Songs download automatically when you play them</Text>
        </View>
      ) : (
        <>
          <Text style={styles.summary}>
            {songs.length} song{songs.length !== 1 ? 's' : ''} · {formatSize(totalSize)} total
          </Text>
          <FlatList
            data={songs}
            keyExtractor={s => s.youtubeId}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <View style={styles.row}>
                <View style={styles.iconWrap}>
                  <Ionicons name="musical-note" size={20} color={Colors.primary} />
                </View>
                <View style={styles.info}>
                  <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.meta} numberOfLines={1}>
                    {item.channelTitle ? `${item.channelTitle} · ` : ''}{formatSize(item.sizeBytes)}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => deleteOne(item)} style={styles.deleteBtn}>
                  <Ionicons name="trash-outline" size={20} color={Colors.error} />
                </TouchableOpacity>
              </View>
            )}
          />
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  backBtn: { padding: 4 },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginLeft: 8,
  },
  clearBtn: { padding: 4 },
  clearText: { fontSize: 14, color: Colors.error, fontWeight: '600' },
  clearDisabled: { color: Colors.iconInactive },
  summary: {
    fontSize: 13,
    color: Colors.textMuted,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  list: { paddingHorizontal: 16, paddingBottom: 32 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
    gap: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1 },
  title: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  meta: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  deleteBtn: { padding: 8 },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  emptyText: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  emptySubtext: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center' },
});
