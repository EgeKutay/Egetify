import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Pressable,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import auth from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { Colors } from '../theme/colors';
import { useAuthStore } from '../store/authStore';

const WEB_CLIENT_ID = (process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '').trim();

GoogleSignin.configure({
  webClientId: WEB_CLIENT_ID,
});

export default function LoginScreen() {
  const loginWithToken = useAuthStore((s) => s.loginWithToken);
  const isLoading = useAuthStore((s) => s.isLoading);
  const error = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);
  const [isSigning, setIsSigning] = useState(false);

  useEffect(() => {
    if (error) {
      Alert.alert('Sign-in failed', error, [{ text: 'OK', onPress: clearError }]);
    }
  }, [error, clearError]);

  const handleGoogleSignIn = async () => {
    setIsSigning(true);
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const signInResult = await GoogleSignin.signIn();

      const idToken = signInResult.data?.idToken ?? (signInResult as any).idToken;
      if (!idToken) throw new Error('Google Sign-In did not return an ID token.');

      const googleCredential = auth.GoogleAuthProvider.credential(idToken);
      const userCredential = await auth().signInWithCredential(googleCredential);

      const firebaseIdToken = await userCredential.user.getIdToken();
      await loginWithToken(firebaseIdToken);
    } catch (e: any) {
      if (e.code === 'SIGN_IN_CANCELLED' || e.code === statusCodes?.SIGN_IN_CANCELLED) return;
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert('Sign-in failed', msg);
    } finally {
      setIsSigning(false);
    }
  };

  const busy = isLoading || isSigning;

  return (
    <LinearGradient
      colors={[Colors.background, Colors.primaryDark, Colors.background]}
      locations={[0, 0.5, 1]}
      style={styles.container}
    >
      <View style={styles.brandContainer}>
        <Image
          source={require('../../assets/icon.png')}
          style={styles.logoImage}
          resizeMode="contain"
        />
        <Text style={styles.appName}>Egetify</Text>
        <Text style={styles.tagline}>Your music, your way</Text>
      </View>

      <View style={styles.features}>
        {[
          { icon: 'search', text: 'Search millions of songs' },
          { icon: 'list', text: 'Build your playlists' },
          { icon: 'play-circle', text: 'Play with YouTube' },
        ].map(({ icon, text }) => (
          <View key={text} style={styles.featureRow}>
            <Ionicons name={icon as any} size={20} color={Colors.primary} style={styles.featureIcon} />
            <Text style={styles.featureText}>{text}</Text>
          </View>
        ))}
      </View>

      <View style={styles.googleButtonWrap}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Continue with Google"
          onPress={handleGoogleSignIn}
          disabled={busy}
          style={({ pressed }) => [
            styles.googleButton,
            busy && styles.buttonDisabled,
            pressed && !busy && styles.googleButtonPressed,
          ]}
        >
          {busy ? (
            <ActivityIndicator color={Colors.background} />
          ) : (
            <>
              <Ionicons name="logo-google" size={22} color={Colors.background} />
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            </>
          )}
        </Pressable>
      </View>

      <Text style={styles.disclaimer}>Personal use only · Powered by YouTube</Text>
    </LinearGradient>
  );
}

// statusCodes from google-signin for error handling
let statusCodes: any;
try {
  statusCodes = require('@react-native-google-signin/google-signin').statusCodes;
} catch {}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  brandContainer: { alignItems: 'center', marginBottom: 48 },
  logoImage: {
    width: 130,
    height: 130,
    marginBottom: 20,
  },
  appName: { fontSize: 42, fontWeight: '800', color: Colors.textPrimary, letterSpacing: 2 },
  tagline: { fontSize: 16, color: Colors.textSecondary, marginTop: 6 },
  features: { width: '100%', marginBottom: 48 },
  googleButtonWrap: { width: '100%' },
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
  googleButtonPressed: { opacity: 0.88 },
  googleButtonText: { fontSize: 17, fontWeight: '700', color: Colors.background },
  disclaimer: { marginTop: 24, fontSize: 12, color: Colors.textMuted, textAlign: 'center' },
});
