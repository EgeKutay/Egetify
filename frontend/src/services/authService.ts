import * as SecureStore from 'expo-secure-store';
import api from './api';
import { AuthResponse, User } from '../types';

const TOKEN_KEY = 'access_token';
const USER_KEY  = 'user_profile';

/**
 * After expo-auth-session returns a Google ID token, send it to our backend.
 * The backend verifies it and returns a JWT + user profile.
 * Both are persisted in SecureStore so the session survives app restarts.
 */
export async function loginWithIdToken(idToken: string): Promise<User> {
  const response = await api.post<AuthResponse>('/auth/google', { idToken }, { timeout: 15000 });
  const { accessToken, user } = response.data;

  // Persist both token and profile — restores session on next launch
  await SecureStore.setItemAsync(TOKEN_KEY, accessToken);
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));

  return user;
}

export async function signOut(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(USER_KEY);
}

/** Restores a previously saved session. Returns null if none exists. */
export async function restoreSession(): Promise<{ token: string; user: User } | null> {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  const userJson = await SecureStore.getItemAsync(USER_KEY);
  if (!token || !userJson) return null;
  return { token, user: JSON.parse(userJson) as User };
}
