import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import api from './api';
import { AuthResponse, User } from '../types';

const GOOGLE_WEB_CLIENT_ID =
  Constants.expoConfig?.extra?.googleWebClientId ?? 'YOUR_GOOGLE_WEB_CLIENT_ID';

/** Call once at app startup (e.g. in App.tsx) */
export function configureGoogleSignIn() {
  GoogleSignin.configure({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    offlineAccess: false,
  });
}

/**
 * Initiates Google Sign-In, sends the ID token to our backend,
 * and persists the returned JWT.
 * Returns the user profile on success.
 */
export async function signInWithGoogle(): Promise<User> {
  await GoogleSignin.hasPlayServices();
  const userInfo = await GoogleSignin.signIn();

  if (!userInfo.idToken) {
    throw new Error('Google Sign-In did not return an ID token');
  }

  const response = await api.post<AuthResponse>('/auth/google', {
    idToken: userInfo.idToken,
  });

  const { accessToken, user } = response.data;
  await SecureStore.setItemAsync('access_token', accessToken);

  return user;
}

export async function signOut(): Promise<void> {
  try {
    await GoogleSignin.revokeAccess();
    await GoogleSignin.signOut();
  } catch (_) {
    // ignore errors on sign-out
  }
  await SecureStore.deleteItemAsync('access_token');
}

/** Returns stored token, or null if not signed in */
export async function getStoredToken(): Promise<string | null> {
  return SecureStore.getItemAsync('access_token');
}
