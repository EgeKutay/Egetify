import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { RootStackParamList } from '../types';

type RouteT = RouteProp<RootStackParamList, 'Error'>;

export default function ErrorScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteT>();
  const message = route.params?.message ?? 'Something went wrong. Please try again.';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Ionicons name="cloud-offline" size={80} color={Colors.error} />
        <Text style={styles.title}>Oops!</Text>
        <Text style={styles.message}>{message}</Text>
        <TouchableOpacity style={styles.button} onPress={() => navigation.goBack()}>
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 16,
  },
  title: { fontSize: 28, fontWeight: '800', color: Colors.textPrimary },
  message: { fontSize: 16, color: Colors.textSecondary, textAlign: 'center' },
  button: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 36,
    borderRadius: 28,
    marginTop: 8,
  },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
