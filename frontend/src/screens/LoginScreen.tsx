import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { Colors } from '../theme/colors';
import { useAuthStore } from '../store/authStore';

// Required for expo-auth-session to close the browser tab after redirect
WebBrowser.maybeCompleteAuthSession();

const WEB_CLIENT_ID     = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';
const ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? '';

export default function LoginScreen() {
  const { loginWithToken, isLoading, error, clearError } = useAuthStore();

  // androidClientId = initiates the OAuth flow on Android
  // webClientId     = passed as serverClientId so the returned ID token
  //                   has the web client ID as its audience (matches backend)
  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: ANDROID_CLIENT_ID,
    webClientId: WEB_CLIENT_ID,
    scopes: ['openid', 'profile', 'email'],
  });

  // React to the result of the Google auth flow
  useEffect(() => {
    if (response?.type === 'success') {
      const idToken = response.params?.id_token;
      if (idToken) {
        loginWithToken(idToken);
      } else {
        Alert.alert('Sign-in failed', 'Google did not return an ID token. Try again.');
      }
    } else if (response?.type === 'error') {
      Alert.alert('Sign-in failed', response.error?.message ?? 'Unknown error');
    }
  }, [response]);

  // Surface store-level errors (e.g. backend rejected the token)
  useEffect(() => {
    if (error) {
      Alert.alert('Sign-in failed', error, [{ text: 'OK', onPress: clearError }]);
    }
  }, [error]);

  const handleLogin = () => {
    clearError();
    promptAsync();
  };

  return (
    <LinearGradient
      colors={[Colors.background, Colors.primaryDark, Colors.background]}
      locations={[0, 0.5, 1]}
      style={styles.container}
    >
      {/* Logo */}
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
          { icon: 'search',       text: 'Search millions of songs' },
          { icon: 'list',         text: 'Build your playlists' },
          { icon: 'play-circle',  text: 'Play with YouTube' },
        ].map(({ icon, text }) => (
          <View key={text} style={styles.featureRow}>
            <Ionicons name={icon as any} size={20} color={Colors.primary} style={styles.featureIcon} />
            <Text style={styles.featureText}>{text}</Text>
          </View>
        ))}
      </View>

      {/* Sign-in button */}
      <TouchableOpacity
        style={[styles.googleButton, (!request || isLoading) && styles.buttonDisabled]}
        onPress={handleLogin}
        disabled={!request || isLoading}
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
  brandContainer: { alignItems: 'center', marginBottom: 48 },
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
  appName: { fontSize: 42, fontWeight: '800', color: Colors.textPrimary, letterSpacing: 2 },
  tagline:  { fontSize: 16, color: Colors.textSecondary, marginTop: 6 },
  features: { width: '100%', marginBottom: 48 },
  featureRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  featureIcon: { marginRight: 12 },
  featureText: { fontSize: 16, color: Colors.textSecondary },
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
  buttonDisabled: { opacity: 0.7 },
  googleButtonText: { fontSize: 17, fontWeight: '700', color: Colors.background },
  disclaimer: { marginTop: 24, fontSize: 12, color: Colors.textMuted, textAlign: 'center' },
});
