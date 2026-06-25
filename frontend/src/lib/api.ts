import axios from 'axios'
import type { InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/store/auth'

declare module 'axios' {
  interface InternalAxiosRequestConfig {
    _retry?: boolean
  }
}

const apiClient = axios.create({
  baseURL: `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
})

// ─── Request interceptor: inject Bearer token ──────────────────────────────
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const { accessToken } = useAuthStore.getState()
    if (accessToken) {
      config.headers['Authorization'] = `Bearer ${accessToken}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// ─── Response interceptor: silent 401 refresh ─────────────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalConfig: InternalAxiosRequestConfig = error.config ?? {}

    if (error.response?.status !== 401 || originalConfig._retry) {
      return Promise.reject(error)
    }

    const { refreshToken, refreshTokens, clearAuth } = useAuthStore.getState()

    if (!refreshToken) {
      clearAuth()
      if (typeof window !== 'undefined') window.location.href = '/login'
      return Promise.reject(error)
    }

    try {
      await refreshTokens()
      originalConfig._retry = true
      return apiClient.request(originalConfig)
    } catch (refreshError) {
      clearAuth()
      if (typeof window !== 'undefined') window.location.href = '/login'
      return Promise.reject(refreshError)
    }
  }
)

export default apiClient
