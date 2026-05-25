import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Keyboard,
  TouchableOpacity,
} from 'react-native';
import * as FileSystem from 'expo-file-system';
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

const HISTORY_PATH = FileSystem.documentDirectory + '_search_history.json';
const MAX_HISTORY = 20;

async function loadHistory(): Promise<string[]> {
  try {
    const { exists } = await FileSystem.getInfoAsync(HISTORY_PATH);
    if (!exists) return [];
    return JSON.parse(await FileSystem.readAsStringAsync(HISTORY_PATH));
  } catch {
    return [];
  }
}

async function saveHistory(history: string[]) {
  try {
    await FileSystem.writeAsStringAsync(HISTORY_PATH, JSON.stringify(history));
  } catch {}
}

async function addToHistory(query: string, history: string[]): Promise<string[]> {
  const next = [query, ...history.filter(h => h.toLowerCase() !== query.toLowerCase())].slice(0, MAX_HISTORY);
  await saveHistory(next);
  return next;
}

async function fetchYoutubeSuggestions(query: string): Promise<string[]> {
  try {
    const url = `https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q=${encodeURIComponent(query)}`;
    const res = await fetch(url);
    const data = await res.json();
    return (data[1] as string[]).slice(0, 5);
  } catch {
    return [];
  }
}

export default function SearchScreen() {
  const navigation = useNavigation<Nav>();
  const { playSong, currentSong } = usePlayerStore();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Song[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadHistory().then(setHistory);
  }, []);

  const updateSuggestions = useCallback((text: string) => {
    if (!text.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    setShowSuggestions(true);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(async () => {
      const ytSuggestions = await fetchYoutubeSuggestions(text);
      const historySuggestions = history.filter(h =>
        h.toLowerCase().startsWith(text.toLowerCase()) && !ytSuggestions.includes(h)
      );
      setSuggestions([...historySuggestions.slice(0, 3), ...ytSuggestions]);
    }, 300);
  }, [history]);

  const handleChangeText = (text: string) => {
    setQuery(text);
    updateSuggestions(text);
  };

  const handleSearch = async (q: string) => {
    if (!q.trim()) return;
    Keyboard.dismiss();
    setShowSuggestions(false);
    setLoading(true);
    setSearched(true);
    setError(null);
    try {
      const data = await searchMusic(q.trim());
      setResults(data);
      const next = await addToHistory(q.trim(), history);
      setHistory(next);
    } catch (err: any) {
      setError(err.message ?? 'Search failed. Check your connection.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionPress = (s: string) => {
    setQuery(s);
    handleSearch(s);
  };

  const handleSongPress = (song: Song) => {
    playSong(song, results);
    navigation.navigate('NowPlaying');
  };

  const historySuggestions = !query.trim()
    ? history.slice(0, 8)
    : [];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.title}>Search</Text>

      <SearchBar
        value={query}
        onChangeText={handleChangeText}
        onSubmit={() => handleSearch(query)}
        placeholder="Songs, artists, albums…"
      />

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <View style={styles.suggestionsBox}>
          {suggestions.map((s, i) => (
            <TouchableOpacity
              key={i}
              style={styles.suggestionRow}
              onPress={() => handleSuggestionPress(s)}
            >
              <Ionicons name="search-outline" size={16} color={Colors.iconInactive} style={styles.suggestionIcon} />
              <Text style={styles.suggestionText} numberOfLines={1}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Past searches shown when bar is focused but empty */}
      {!showSuggestions && !searched && historySuggestions.length > 0 && (
        <View style={styles.historySection}>
          <Text style={styles.sectionLabel}>Recent searches</Text>
          {historySuggestions.map((h, i) => (
            <TouchableOpacity key={i} style={styles.suggestionRow} onPress={() => handleSuggestionPress(h)}>
              <Ionicons name="time-outline" size={16} color={Colors.iconInactive} style={styles.suggestionIcon} />
              <Text style={styles.suggestionText} numberOfLines={1}>{h}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

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

      {!loading && !error && !searched && historySuggestions.length === 0 && (
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
  suggestionsBox: {
    marginHorizontal: 20,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.divider,
    overflow: 'hidden',
    zIndex: 10,
  },
  historySection: {
    marginHorizontal: 20,
    marginTop: 8,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textMuted,
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  suggestionIcon: { marginRight: 10 },
  suggestionText: { fontSize: 15, color: Colors.textPrimary, flex: 1 },
});
