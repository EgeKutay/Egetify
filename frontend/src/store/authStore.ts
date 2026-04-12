import { create } from 'zustand';
import { User } from '../types';
import { loginWithIdToken, signOut, restoreSession } from '../services/authService';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  /** Called from LoginScreen after expo-auth-session returns a Google ID token */
  loginWithToken: (idToken: string) => Promise<void>;
  logout: () => Promise<void>;
  /** Called once on app launch — restores persisted session so user stays logged in */
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,   // true on launch until checkAuth completes
  error: null,

  loginWithToken: async (idToken: string) => {
    set({ isLoading: true, error: null });
    try {
      const user = await loginWithIdToken(idToken);
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (err: any) {
      set({ error: err.message ?? 'Login failed', isLoading: false });
    }
  },

  logout: async () => {
    await signOut();
    set({ user: null, isAuthenticated: false });
  },

  /**
   * Runs at app startup.
   * If a token + profile are stored, the user is logged straight in —
   * no sign-in screen shown.
   */
  checkAuth: async () => {
    try {
      const session = await restoreSession();
      if (session) {
        set({ user: session.user, isAuthenticated: true, isLoading: false });
      } else {
        set({ isAuthenticated: false, isLoading: false });
      }
    } catch {
      set({ isAuthenticated: false, isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
}));
