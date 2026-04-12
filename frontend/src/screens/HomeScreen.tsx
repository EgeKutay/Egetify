import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { Song, RootStackParamList } from '../types';
import { getRecentlyPlayed, getRecommendations } from '../services/musicService';
import { usePlayerStore } from '../store/playerStore';
import { useAuthStore } from '../store/authStore';
import SongCard from '../components/SongCard';
import MiniPlayer from '../components/MiniPlayer';

type Nav = StackNavigationProp<RootStackParamList>;

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const { user } = useAuthStore();
  const { playSong, currentSong } = usePlayerStore();

  const [recentlyPlayed, setRecentlyPlayed] = useState<Song[]>([]);
  const [recommended, setRecommended] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [recent, recs] = await Promise.all([
        getRecentlyPlayed(),
        getRecommendations(),
      ]);
      setRecentlyPlayed(recent);
      setRecommended(recs);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load feed');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleSongPress = (song: Song, queue: Song[]) => {
    playSong(song, queue);
    navigation.navigate('NowPlaying');
  };

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="cloud-offline" size={64} color={Colors.error} />
          <Text style={styles.errorTitle}>Couldn't load your feed</Text>
          <Text style={styles.errorMsg}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadData}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>
              {getGreeting()}, {user?.name?.split(' ')[0] ?? 'there'} 👋
            </Text>
            <Text style={styles.subtitle}>What are we listening to?</Text>
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(user?.name?.[0] ?? 'E').toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Recently Played */}
        {recentlyPlayed.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recently Played</Text>
            <FlatList
              data={recentlyPlayed}
              keyExtractor={(item) => item.youtubeId}
              renderItem={({ item }) => (
                <SongCard
                  song={item}
                  onPress={() => handleSongPress(item, recentlyPlayed)}
                  style={styles.horizontalCard}
                  horizontal
                />
              )}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
            />
          </View>
        )}

        {/* Recommended */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recommended For You</Text>
          {loading
            ? Array.from({ length: 5 }).map((_, i) => (
                <View key={i} style={styles.skeleton} />
              ))
            : recommended.map((song) => (
                <SongCard
                  key={song.youtubeId}
                  song={song}
                  onPress={() => handleSongPress(song, recommended)}
                />
              ))}
        </View>
      </ScrollView>

      {/* Mini player at bottom */}
      {currentSong && (
        <MiniPlayer onPress={() => navigation.navigate('NowPlaying')} />
      )}
    </SafeAreaView>
  );
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingBottom: 100 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  greeting: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary },
  subtitle: { fontSize: 14, color: Colors.textSecondary, marginTop: 2 },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 18 },
  section: { marginTop: 24, paddingHorizontal: 20 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 14,
  },
  horizontalList: { gap: 12 },
  horizontalCard: { width: 150 },
  skeleton: {
    height: 70,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    marginBottom: 10,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: 16,
  },
  errorMsg: { color: Colors.textSecondary, marginTop: 8, textAlign: 'center' },
  retryBtn: {
    marginTop: 24,
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 24,
  },
  retryText: { color: '#fff', fontWeight: '700' },
});
