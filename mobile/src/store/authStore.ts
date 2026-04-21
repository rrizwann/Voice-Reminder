import { create } from 'zustand';
import { getStoredToken, login, logout, register } from '../services/auth';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, timezone: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  isLoading: true,

  initialize: async () => {
    const token = await getStoredToken();
    set({ isAuthenticated: !!token, isLoading: false });
  },

  login: async (email, password) => {
    await login(email, password);
    set({ isAuthenticated: true });
  },

  register: async (name, email, password, timezone) => {
    await register(name, email, password, timezone);
    set({ isAuthenticated: true });
  },

  logout: async () => {
    await logout();
    set({ isAuthenticated: false });
  },
}));
