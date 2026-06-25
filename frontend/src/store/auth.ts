import { create } from 'zustand'
import { apiLogin, apiRegister, apiRefresh, apiLogout } from '@/lib/auth-api'
import type { AuthState, AuthUser, LoginRequest, RegisterRequest } from '@/types/auth'

function setAuthCookie() {
  document.cookie = 'is_authenticated=1; path=/; SameSite=Lax'
}

function clearAuthCookie() {
  document.cookie = 'is_authenticated=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax'
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,

  setTokens: (access: string, refresh: string, user: AuthUser) => {
    set({ accessToken: access, refreshToken: refresh, user })
  },

  clearAuth: () => {
    set({ accessToken: null, refreshToken: null, user: null })
    if (typeof window !== 'undefined') clearAuthCookie()
  },

  login: async (credentials: LoginRequest) => {
    const response = await apiLogin(credentials)
    set({ accessToken: response.access_token, refreshToken: response.refresh_token, user: response.user })
    if (typeof window !== 'undefined') setAuthCookie()
  },

  register: async (data: RegisterRequest) => {
    const response = await apiRegister(data)
    set({ accessToken: response.access_token, refreshToken: response.refresh_token, user: response.user })
    if (typeof window !== 'undefined') setAuthCookie()
  },

  logout: async () => {
    const { refreshToken } = get()
    // Clear state immediately so UI updates even on network failure
    set({ accessToken: null, refreshToken: null, user: null })
    if (typeof window !== 'undefined') clearAuthCookie()
    if (refreshToken) {
      try {
        await apiLogout({ refresh_token: refreshToken })
      } catch {
        // Silently swallow — token may already be invalid
      }
    }
  },

  refreshTokens: async () => {
    const { refreshToken } = get()
    if (!refreshToken) {
      throw new Error('No refresh token — user must re-authenticate.')
    }
    const response = await apiRefresh({ refresh_token: refreshToken })
    set({ accessToken: response.access_token, refreshToken: response.refresh_token, user: response.user })
  },
}))
