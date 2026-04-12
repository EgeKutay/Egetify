import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { Song, Playlist, RootStackParamList } from '../types';
import { getPlaylistDetail } from '../services/playlistService';
import { usePlaylistStore } from '../store/playlistStore';
import { usePlayerStore } from '../store/playerStore';
import SongCard from '../components/SongCard';
import MiniPlayer from '../components/MiniPlayer';

type Nav = StackNavigationProp<RootStackParamList>;
type RouteT = RouteProp<RootStackParamList, 'Playlist'>;

export default function PlaylistScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteT>();
  const { playlistId } = route.params;

  const { removeSong } = usePlaylistStore();
  const { playSong, currentSong } = usePlayerStore();

  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPlaylist = async () => {
    try {
      setError(null);
      const data = await getPlaylistDetail(playlistId);
      setPlaylist(data);
    } catch (err: any) {
      setError(err.message ?? 'Could not load playlist');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPlaylist(); }, [playlistId]);

  const handlePlay = (song: Song) => {
    playSong(song, playlist?.songs ?? [], playlist ?? undefined);
    navigation.navigate('NowPlaying');
  };

  const handlePlayAll = () => {
    if (!playlist?.songs?.length) return;
    handlePlay(playlist.songs[0]);
  };

  const handleRemove = (song: Song) => {
    Alert.alert('Remove song', `Remove "${song.title}" from this playlist?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await removeSong(playlistId, song.youtubeId);
            // Refresh playlist detail
            await loadPlaylist();
          } catch (err: any) {
            Alert.alert('Error', err.message);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !playlist) {
    return (
      <SafeAreaView style={styles.container}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.centered}>
          <Ionicons name="cloud-offline" size={56} color={Colors.error} />
          <Text style={styles.errorText}>{error ?? 'Playlist not found'}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadPlaylist}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{playlist.name}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Playlist info banner */}
      <View style={styles.infoBanner}>
        <View style={styles.playlistCover}>
          <Ionicons name="musical-notes" size={40} color={Colors.primary} />
        </View>
        <Text style={styles.playlistName}>{playlist.name}</Text>
        {playlist.description ? (
          <Text style={styles.playlistDesc}>{playlist.description}</Text>
        ) : null}
        <Text style={styles.songCount}>
          {playlist.songCount} song{playlist.songCount !== 1 ? 's' : ''}
        </Text>

        {/* Play All button */}
        {playlist.songs && playlist.songs.length > 0 && (
          <TouchableOpacity style={styles.playAllBtn} onPress={handlePlayAll}>
            <Ionicons name="play" size={18} color="#fff" />
            <Text style={styles.playAllText}>Play All</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Song list */}
      {playlist.songs && playlist.songs.length > 0 ? (
        <FlatList
          data={playlist.songs}
          keyExtractor={(item) => item.youtubeId}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <SongCard
              song={item}
              onPress={() => handlePlay(item)}
              rightAction={
                <TouchableOpacity
                  onPress={() => handleRemove(item)}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <Ionicons name="remove-circle-outline" size={22} color={Colors.error} />
                </TouchableOpacity>
              }
            />
          )}
        />
      ) : (
        <View style={styles.centered}>
          <Ionicons name="musical-note-outline" size={56} color={Colors.textMuted} />
          <Text style={styles.emptyText}>No songs yet</Text>
          <Text style={styles.emptyHint}>Search for songs and add them here</Text>
        </View>
      )}

      {currentSong && (
        <MiniPlayer onPress={() => navigation.navigate('NowPlaying')} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: { padding: 4 },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginHorizontal: 8,
  },
  infoBanner: { alignItems: 'center', paddingHorizontal: 20, paddingBottom: 20 },
  playlistCover: {
    width: 120,
    height: 120,
    borderRadius: 16,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  playlistName: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  playlistDesc: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  songCount: { fontSize: 13, color: Colors.textMuted, marginTop: 4 },
  playAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 24,
    marginTop: 14,
  },
  playAllText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  list: { paddingHorizontal: 20, paddingBottom: 100 },
  errorText: { fontSize: 16, color: Colors.textSecondary, textAlign: 'center' },
  retryBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 20,
  },
  retryText: { color: '#fff', fontWeight: '700' },
  emptyText: { fontSize: 18, fontWeight: '600', color: Colors.textPrimary },
  emptyHint: { fontSize: 14, color: Colors.textSecondary },
});
