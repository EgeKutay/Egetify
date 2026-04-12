import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { Colors } from '../theme/colors';
import { useAuthStore } from '../store/authStore';

// Required for expo-auth-session to close the browser tab after redirect
WebBrowser.maybeCompleteAuthSession();

type ExpoExtra = {
  googleWebClientId?: string;
  googleAndroidClientId?: string;
};

function readExtra(): ExpoExtra {
  return (Constants.expoConfig?.extra ?? {}) as ExpoExtra;
}

/** Env is preferred; app.json `extra` is a fallback when Metro did not inline .env (e.g. stale cache). */
function resolveGoogleClientIds() {
  const extra = readExtra();
  const web =
    (process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '').trim() ||
    (extra.googleWebClientId ?? '').trim();
  const android =
    (process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? '').trim() ||
    (extra.googleAndroidClientId ?? '').trim() ||
    (extra.googleWebClientId ?? '').trim(); // legacy: single extra key used for native
  const ios = (process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '').trim();
  return { web, android, ios };
}

const { web: WEB_CLIENT_ID, android: ANDROID_CLIENT_ID, ios: IOS_CLIENT_ID } = resolveGoogleClientIds();

function googleIdsConfiguredForPlatform(): boolean {
  if (Platform.OS === 'web') return !!WEB_CLIENT_ID;
  if (Platform.OS === 'android') return !!ANDROID_CLIENT_ID;
  if (Platform.OS === 'ios') return !!(IOS_CLIENT_ID || WEB_CLIENT_ID);
  return !!WEB_CLIENT_ID;
}

/** Expo Go always uses exp://… redirects; Google Cloud rejects those for Web OAuth clients, so native Google sign-in cannot work there. */
function isExpoGoNativeClient(): boolean {
  return Platform.OS !== 'web' && Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
}

/** Stable reference for expo-auth-session (new [] each render would churn the auth hook). */
const GOOGLE_AUTH_SCOPES = ['openid', 'profile', 'email'] as const;

type GoogleSignInRowProps = {
  webClientId: string;
  androidClientId: string;
  /** Used on iOS; caller ensures non-empty when this row is shown. */
  iosClientId: string;
  loginWithToken: (idToken: string) => void;
  isLoading: boolean;
  clearError: () => void;
};

/**
 * Isolated so `useIdTokenAuthRequest` only runs when this platform has a non-empty client id
 * (the hook throws if e.g. `androidClientId` is missing on Android).
 */
function GoogleSignInRow({
  webClientId,
  androidClientId,
  iosClientId,
  loginWithToken,
  isLoading,
  clearError,
}: GoogleSignInRowProps) {
  const warnedNoRequest = useRef(false);
  const [isPromptingGoogle, setIsPromptingGoogle] = useState(false);
  /** Prevents duplicate backend login if the OAuth hook re-emits the same id_token. */
  const lastExchangedIdToken = useRef<string | null>(null);

  const googleAuthConfig = useMemo(
    () => ({
      androidClientId: androidClientId || undefined,
      iosClientId: iosClientId || undefined,
      webClientId: webClientId || undefined,
      scopes: [...GOOGLE_AUTH_SCOPES],
    }),
    [androidClientId, iosClientId, webClientId]
  );

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest(googleAuthConfig);

  useEffect(() => {
    if (!__DEV__ || !request?.redirectUri || isExpoGoNativeClient()) return;
    console.warn(
      '[Google OAuth] Dev build / web: if Google reports redirect_uri errors, register this exact redirect URI\n' +
        'on your OAuth client (Web client → Authorized redirect URIs; must be https:// or http://localhost per Google rules).\n',
      request.redirectUri
    );
  }, [request]);

  useEffect(() => {
    if (request || warnedNoRequest.current) return;
    const t = setTimeout(() => {
      if (!request) {
        warnedNoRequest.current = true;
        console.warn(
          '[GoogleSignIn] Request still null after 10s. Check client IDs, Google Cloud redirect URIs for this app, ' +
            'and Metro for rejected makeAuthUrlAsync. Try: npx expo start -c'
        );
      }
    }, 10_000);
    return () => clearTimeout(t);
  }, [request]);

  useEffect(() => {
    if (response?.type === 'success') {
      const idToken = response.params?.id_token;
      if (idToken) {
        if (lastExchangedIdToken.current === idToken) return;
        lastExchangedIdToken.current = idToken;
        void Promise.resolve(loginWithToken(idToken)).catch(() => {
          lastExchangedIdToken.current = null;
        });
      } else {
        if (__DEV__) {
          console.warn('[GoogleSignIn] Success but no id_token in params:', response.params);
        }
        Alert.alert('Sign-in failed', 'Google did not return an ID token. Try again.');
      }
    } else if (response?.type === 'error') {
      Alert.alert('Sign-in failed', response.error?.message ?? 'Unknown error');
    } else if (response?.type === 'dismiss' || response?.type === 'cancel') {
      if (__DEV__) console.log('[GoogleSignIn] User dismissed or cancelled:', response.type);
      const androidHint =
        Platform.OS === 'android'
          ? '\n\nOn Android, Google sign-in needs a browser that supports Custom Tabs (usually Chrome). If nothing opened, install/enable Chrome or clear the default browser app, then try again.'
          : '';
      Alert.alert(
        response.type === 'dismiss' ? 'Sign-in closed' : 'Sign-in did not start',
        response.type === 'dismiss'
          ? 'The sign-in window closed before finishing.'
          : `The sign-in browser did not open or the flow was cancelled.${androidHint}`
      );
    } else if (response?.type === 'locked') {
      if (__DEV__) console.warn('[GoogleSignIn] Session locked (prompt already active)');
      Alert.alert(
        'Sign-in busy',
        'Another Google sign-in is already running. Finish or close it, or restart the app and try again.'
      );
    }
    if (
      response?.type === 'dismiss' ||
      response?.type === 'cancel' ||
      response?.type === 'error' ||
      response?.type === 'locked'
    ) {
      lastExchangedIdToken.current = null;
    }
  }, [response, loginWithToken]);

  const handleLogin = () => {
    // Always log here: Metro only shows device logs when the JS runtime is connected (USB / same LAN).
    console.warn('[Egetify] Google sign-in pressed, request ready:', !!request);
    clearError();
    if (!request) {
      Alert.alert(
        'Google Sign-In not ready',
        'The sign-in client did not finish loading. Restart Expo with a clean cache (npx expo start -c) and confirm redirect URIs in Google Cloud Console match this app (Expo Go vs standalone).'
      );
      return;
    }
    // Defer heavy work off the native touch/press stack — avoids Android ANRs when opening Custom Tabs.
    setTimeout(() => {
      void (async () => {
        setIsPromptingGoogle(true);
        try {
          const promptResult = await promptAsync();
          if (__DEV__) console.log('[GoogleSignIn] promptAsync result:', promptResult?.type);
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e);
          console.warn('[GoogleSignIn] promptAsync error:', message);
          Alert.alert('Sign-in failed', message);
        } finally {
          setIsPromptingGoogle(false);
        }
      })();
    }, 0);
  };

  const busy = isLoading || isPromptingGoogle;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Continue with Google"
      onPress={handleLogin}
      disabled={busy}
      style={({ pressed }) => [
        styles.googleButton,
        (!request || busy) && styles.buttonDisabled,
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
  );
}

export default function LoginScreen() {
  const loginWithToken = useAuthStore((s) => s.loginWithToken);
  const isLoading = useAuthStore((s) => s.isLoading);
  const error = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);

  useEffect(() => {
    if (__DEV__) {
      const missing: string[] = [];
      if (Platform.OS === 'web' && !WEB_CLIENT_ID) missing.push('EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID');
      if (Platform.OS === 'android' && !ANDROID_CLIENT_ID) missing.push('EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID');
      if (Platform.OS === 'ios' && !IOS_CLIENT_ID && !WEB_CLIENT_ID) {
        missing.push('EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID or EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID');
      }
      if (missing.length) {
        console.warn(
          '[LoginScreen] Google Sign-In is misconfigured. Set in frontend/.env then restart Expo:\n',
          missing.join(', ')
        );
      }
    }
  }, []);

  useEffect(() => {
    if (error) {
      Alert.alert('Sign-in failed', error, [{ text: 'OK', onPress: clearError }]);
    }
  }, [error, clearError]);

  const iosId = IOS_CLIENT_ID || WEB_CLIENT_ID;

  return (
    <LinearGradient
      colors={[Colors.background, Colors.primaryDark, Colors.background]}
      locations={[0, 0.5, 1]}
      style={styles.container}
    >
      <View style={styles.brandContainer}>
        <View style={styles.logoCircle}>
          <Ionicons name="musical-notes" size={56} color={Colors.primary} />
        </View>
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

      {!googleIdsConfiguredForPlatform() ? (
        <View style={styles.configHintBox}>
          <Text style={styles.configHintTitle}>Google Sign-In is not configured</Text>
          <Text style={styles.configHintText}>
            Add the right EXPO_PUBLIC_GOOGLE_* values to frontend/.env for this platform (see .env.template), then
            restart Expo with a clean cache: npx expo start -c
          </Text>
        </View>
      ) : isExpoGoNativeClient() ? (
        <View style={styles.configHintBox}>
          <Text style={styles.configHintTitle}>Google Sign-In does not run in Expo Go</Text>
          <Text style={styles.configHintText}>
            Expo Go uses an exp:// redirect URI. Google’s Web OAuth client only allows https:// (and limited
            http://localhost) redirect URIs, so exp:// is rejected and sign-in cannot complete here. Use a
            development build instead: from the frontend folder run npx expo run:android or npx expo run:ios, then
            add your debug SHA-1 and package name (see app.json) to a Google Cloud Android OAuth client. Or test
            sign-in on Expo web (press w in Metro) with localhost redirect URIs registered on your Web client.
          </Text>
        </View>
      ) : (
        <View style={styles.googleButtonWrap}>
          <GoogleSignInRow
            webClientId={WEB_CLIENT_ID}
            androidClientId={ANDROID_CLIENT_ID}
            iosClientId={iosId}
            loginWithToken={loginWithToken}
            isLoading={isLoading}
            clearError={clearError}
          />
        </View>
      )}

      <Text style={styles.disclaimer}>Personal use only · Powered by YouTube</Text>
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
  configHintBox: {
    width: '100%',
    padding: 16,
    borderRadius: 12,
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  configHintTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: 8 },
  configHintText: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },
  disclaimer: { marginTop: 24, fontSize: 12, color: Colors.textMuted, textAlign: 'center' },
});
