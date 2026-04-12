import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { useAuthStore } from '../store/authStore';

export default function LoginScreen() {
  const { login, isLoading, error, clearError } = useAuthStore();

  const handleLogin = async () => {
    clearError();
    await login();
    if (error) {
      Alert.alert('Sign-in failed', error);
    }
  };

  return (
    <LinearGradient
      colors={[Colors.background, Colors.primaryDark, Colors.background]}
      locations={[0, 0.5, 1]}
      style={styles.container}
    >
      {/* Logo / branding */}
      <View style={styles.brandContainer}>
        <View style={styles.logoCircle}>
          <Ionicons name="musical-notes" size={56} color={Colors.primary} />
        </View>
        <Text style={styles.appName}>Egetify</Text>
        <Text style={styles.tagline}>Your music, your way</Text>
      </View>

      {/* Feature bullets */}
      <View style={styles.features}>
        {[
          { icon: 'search', text: 'Search millions of songs' },
          { icon: 'list', text: 'Build your playlists' },
          { icon: 'play-circle', text: 'Play with YouTube' },
        ].map(({ icon, text }) => (
          <View key={text} style={styles.featureRow}>
            <Ionicons
              name={icon as any}
              size={20}
              color={Colors.primary}
              style={styles.featureIcon}
            />
            <Text style={styles.featureText}>{text}</Text>
          </View>
        ))}
      </View>

      {/* Sign-in button */}
      <TouchableOpacity
        style={[styles.googleButton, isLoading && styles.buttonDisabled]}
        onPress={handleLogin}
        disabled={isLoading}
        activeOpacity={0.85}
      >
        {isLoading ? (
          <ActivityIndicator color={Colors.background} />
        ) : (
          <>
            <Ionicons name="logo-google" size={22} color={Colors.background} />
            <Text style={styles.googleButtonText}>Continue with Google</Text>
          </>
        )}
      </TouchableOpacity>

      <Text style={styles.disclaimer}>
        Personal use only · Powered by YouTube
      </Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  appName: {
    fontSize: 42,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: 2,
  },
  tagline: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 6,
  },
  features: {
    width: '100%',
    marginBottom: 48,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  featureIcon: {
    marginRight: 12,
  },
  featureText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 30,
    width: '100%',
    gap: 10,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  googleButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.background,
  },
  disclaimer: {
    marginTop: 24,
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});
