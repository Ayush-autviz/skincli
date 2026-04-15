// authStore.js
// Zustand store for user authentication and profile management

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

const useAuthStore = create(
  persist(
    (set, get) => ({
      // User authentication state
      user: null,
      isAuthenticated: false,
      loading: false,

      // Tokens
      accessToken: null,
      refreshToken: null,

      // FCM Token
      fcmToken: null,
      fcmTokenRegistered: false,

      // Profile data and status
      profile: null,
      profileStatus: null, // true = complete, false = incomplete
      hasSeenRoutineAlert: false,

      // Top Concerns
      topConcerns: [],

      // Actions
      setUser: (user) => set({ user, isAuthenticated: !!user }),

      setTokens: (accessToken, refreshToken) => set({
        accessToken,
        refreshToken
      }),

      setFCMToken: (fcmToken) => set({
        fcmToken,
        fcmTokenRegistered: false // Reset registration status when token changes
      }),

      setFCMTokenRegistered: (registered) => set({
        fcmTokenRegistered: registered
      }),

      setProfile: (profile) => set({ profile }),

      setProfileStatus: (profileStatus) => set({ profileStatus }),

      setTopConcerns: (topConcerns) => set({ topConcerns }),

      setHasSeenRoutineAlert: (hasSeenRoutineAlert) => set({ hasSeenRoutineAlert }),

      setLoading: (loading) => set({ loading }),

      updateProfile: (profileData) => set((state) => ({
        profile: { ...state.profile, ...profileData }
      })),

      // Clear all auth data on logout
      logout: () => set({
        user: null,
        isAuthenticated: false,
        accessToken: null,
        refreshToken: null,
        fcmToken: null,
        fcmTokenRegistered: false,
        profile: null,
        profileStatus: null,
        topConcerns: [],
        loading: false
      }),

      // Get current state
      getState: () => get(),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        fcmToken: state.fcmToken,
        fcmTokenRegistered: state.fcmTokenRegistered,
        profile: state.profile,
        profileStatus: state.profileStatus,
        topConcerns: state.topConcerns,
        hasSeenRoutineAlert: state.hasSeenRoutineAlert,
      }),
    }
  )
);

export default useAuthStore; 