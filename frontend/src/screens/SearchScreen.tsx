import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Keyboard,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { Song, RootStackParamList } from '../types';
import { searchMusic } from '../services/musicService';
import { usePlayerStore } from '../store/playerStore';
import SongCard from '../components/SongCard';
import SearchBar from '../components/SearchBar';
import MiniPlayer from '../components/MiniPlayer';

type Nav = StackNavigationProp<RootStackParamList>;

export default function SearchScreen() {
  const navigation = useNavigation<Nav>();
  const { playSong, currentSong } = usePlayerStore();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Song[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (q: string) => {
    if (!q.trim()) return;
    Keyboard.dismiss();
    setLoading(true);
    setSearched(true);
    setError(null);
    try {
      const data = await searchMusic(q.trim());
      setResults(data);
    } catch (err: any) {
      setError(err.message ?? 'Search failed. Check your connection.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSongPress = (song: Song) => {
    playSong(song, results);
    navigation.navigate('NowPlaying');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.title}>Search</Text>

      <SearchBar
        value={query}
        onChangeText={setQuery}
        onSubmit={() => handleSearch(query)}
        placeholder="Songs, artists, albums…"
      />

      {/* States */}
      {loading && (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.statusText}>Searching YouTube…</Text>
        </View>
      )}

      {error && !loading && (
        <View style={styles.centered}>
          <Ionicons name="cloud-offline-outline" size={56} color={Colors.error} />
          <Text style={styles.errorTitle}>Search failed</Text>
          <Text style={styles.statusText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => handleSearch(query)}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {!loading && !error && searched && results.length === 0 && (
        <View style={styles.centered}>
          <Ionicons name="musical-note-outline" size={56} color={Colors.textMuted} />
          <Text style={styles.statusText}>No results for "{query}"</Text>
        </View>
      )}

      {!loading && !error && results.length > 0 && (
        <FlatList
          data={results}
          keyExtractor={(item) => item.youtubeId}
          renderItem={({ item }) => (
            <SongCard song={item} onPress={() => handleSongPress(item)} />
          )}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Placeholder when nothing searched yet */}
      {!loading && !error && !searched && (
        <View style={styles.centered}>
          <Ionicons name="search-outline" size={56} color={Colors.textMuted} />
          <Text style={styles.statusText}>Search for any song or artist</Text>
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
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.textPrimary,
    paddingHorizontal: 20,
    paddingTop: 16,
    marginBottom: 12,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  statusText: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center' },
  errorTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  list: { paddingHorizontal: 20, paddingBottom: 100 },
  retryBtn: {
    marginTop: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 28,
    borderRadius: 20,
  },
  retryText: { color: '#fff', fontWeight: '700' },
});
