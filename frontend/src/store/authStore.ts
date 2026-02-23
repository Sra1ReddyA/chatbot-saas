'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Organization, Tokens } from '../lib/api';
import { authApi } from '../lib/api';

interface AuthState {
  user: User | null;
  organization: Organization | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    name: string;
    organizationName: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  clearError: () => void;
  setOrganization: (org: Organization) => void;
}

function storeTokens(tokens: Tokens) {
  localStorage.setItem('access_token', tokens.accessToken);
  localStorage.setItem('refresh_token', tokens.refreshToken);
}

function clearTokens() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      organization: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const { user, organization, tokens } = await authApi.login({ email, password });
          storeTokens(tokens);
          set({ user, organization, isAuthenticated: true, isLoading: false });
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Login failed';
          set({ error: message, isLoading: false });
          throw err;
        }
      },

      register: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const { user, organization, tokens } = await authApi.register(data);
          storeTokens(tokens);
          set({ user, organization, isAuthenticated: true, isLoading: false });
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Registration failed';
          set({ error: message, isLoading: false });
          throw err;
        }
      },

      logout: async () => {
        try {
          await authApi.logout();
        } catch {
          // Ignore logout errors
        }
        clearTokens();
        set({ user: null, organization: null, isAuthenticated: false });
      },

      loadUser: async () => {
        const token = localStorage.getItem('access_token');
        if (!token) return;

        set({ isLoading: true });
        try {
          const { user, organization } = await authApi.me();
          set({ user, organization, isAuthenticated: true, isLoading: false });
        } catch {
          clearTokens();
          set({ user: null, organization: null, isAuthenticated: false, isLoading: false });
        }
      },

      clearError: () => set({ error: null }),

      setOrganization: (organization) => set({ organization }),
    }),
    {
      name: 'auth-store',
      partialize: (state) => ({
        user: state.user,
        organization: state.organization,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
