import { create } from 'zustand';
import { User } from '../types';
import { signInWithGoogle, signOut, getStoredToken } from '../services/authService';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: () => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  /** Trigger Google Sign-In flow */
  login: async () => {
    set({ isLoading: true, error: null });
    try {
      const user = await signInWithGoogle();
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (err: any) {
      set({ error: err.message ?? 'Login failed', isLoading: false });
    }
  },

  logout: async () => {
    await signOut();
    set({ user: null, isAuthenticated: false });
  },

  /** Called on app launch to restore session */
  checkAuth: async () => {
    const token = await getStoredToken();
    if (!token) {
      set({ isAuthenticated: false });
    }
    // Token existence is enough to mark as authenticated;
    // the API interceptor attaches it to every request.
    // A 401 response will clear it automatically.
    set({ isAuthenticated: !!token });
  },

  clearError: () => set({ error: null }),
}));
