import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { RootStackParamList } from '../types';
import { usePlaylistStore } from '../store/playlistStore';
import { useAuthStore } from '../store/authStore';
import MiniPlayer from '../components/MiniPlayer';
import { usePlayerStore } from '../store/playerStore';

type Nav = StackNavigationProp<RootStackParamList>;

export default function LibraryScreen() {
  const navigation = useNavigation<Nav>();
  const { playlists, fetchPlaylists, createPlaylist, deletePlaylist, isLoading } =
    usePlaylistStore();
  const { logout } = useAuthStore();
  const { currentSong } = usePlayerStore();

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => { fetchPlaylists(); }, [fetchPlaylists]);

  const handleCreate = async () => {
    if (!newName.trim()) {
      Alert.alert('Name required', 'Please enter a playlist name.');
      return;
    }
    setCreating(true);
    try {
      await createPlaylist(newName.trim(), newDesc.trim() || undefined);
      setShowCreate(false);
      setNewName('');
      setNewDesc('');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = (id: number, name: string) => {
    Alert.alert('Delete Playlist', `Delete "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deletePlaylist(id),
      },
    ]);
  };

  const handleLogout = () => {
    Alert.alert('Sign out', 'Sign out of Egetify?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Your Library</Text>
        <TouchableOpacity onPress={handleLogout} style={styles.headerBtn}>
          <Ionicons name="log-out-outline" size={24} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Create playlist button */}
      <TouchableOpacity
        style={styles.createBtn}
        onPress={() => setShowCreate(true)}
        activeOpacity={0.85}
      >
        <Ionicons name="add-circle" size={22} color={Colors.primary} />
        <Text style={styles.createBtnText}>New Playlist</Text>
      </TouchableOpacity>

      {isLoading && playlists.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : playlists.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="list-outline" size={56} color={Colors.textMuted} />
          <Text style={styles.emptyText}>No playlists yet</Text>
          <Text style={styles.emptyHint}>Create one to start organising your music</Text>
        </View>
      ) : (
        <FlatList
          data={playlists}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.playlistRow}
              onPress={() => navigation.navigate('Playlist', { playlistId: item.id })}
              activeOpacity={0.8}
            >
              <View style={styles.playlistIcon}>
                <Ionicons name="musical-notes" size={24} color={Colors.primary} />
              </View>
              <View style={styles.playlistInfo}>
                <Text style={styles.playlistName} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.playlistMeta}>
                  {item.songCount} song{item.songCount !== 1 ? 's' : ''}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => handleDelete(item.id, item.name)}
                style={styles.deleteBtn}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="trash-outline" size={18} color={Colors.textMuted} />
              </TouchableOpacity>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Create Playlist Modal */}
      <Modal visible={showCreate} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>New Playlist</Text>
            <TextInput
              style={styles.input}
              placeholder="Playlist name"
              placeholderTextColor={Colors.textMuted}
              value={newName}
              onChangeText={setNewName}
              maxLength={100}
              autoFocus
            />
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              placeholder="Description (optional)"
              placeholderTextColor={Colors.textMuted}
              value={newDesc}
              onChangeText={setNewDesc}
              maxLength={300}
              multiline
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => { setShowCreate(false); setNewName(''); setNewDesc(''); }}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.confirmBtn]}
                onPress={handleCreate}
                disabled={creating}
              >
                {creating
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.confirmBtnText}>Create</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {currentSong && (
        <MiniPlayer onPress={() => navigation.navigate('NowPlaying')} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: { fontSize: 28, fontWeight: '800', color: Colors.textPrimary },
  headerBtn: { padding: 4 },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  createBtnText: { color: Colors.primary, fontWeight: '700', fontSize: 15 },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  emptyText: { fontSize: 18, fontWeight: '600', color: Colors.textPrimary },
  emptyHint: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center' },
  list: { paddingHorizontal: 20, paddingBottom: 100 },
  playlistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
    gap: 12,
  },
  playlistIcon: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playlistInfo: { flex: 1 },
  playlistName: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary },
  playlistMeta: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  deleteBtn: { padding: 4 },
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  input: {
    backgroundColor: Colors.surfaceAlt,
    color: Colors.textPrimary,
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  inputMultiline: { height: 80, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  cancelBtn: { backgroundColor: Colors.surfaceAlt },
  cancelBtnText: { color: Colors.textSecondary, fontWeight: '600' },
  confirmBtn: { backgroundColor: Colors.primary },
  confirmBtnText: { color: '#fff', fontWeight: '700' },
});
