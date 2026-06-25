import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { InternalAxiosRequestConfig } from 'axios'

// vi.mock is hoisted above imports — mocks the store before api.ts evaluates
vi.mock('@/store/auth', () => ({
  useAuthStore: {
    getState: vi.fn(() => ({
      accessToken: null,
      refreshToken: null,
      refreshTokens: vi.fn(),
      clearAuth: vi.fn(),
    })),
  },
}))

const { default: apiClient } = await import('@/lib/api')
const { useAuthStore } = await import('@/store/auth')

const getMockState = (overrides = {}) => ({
  accessToken: null,
  refreshToken: null,
  refreshTokens: vi.fn(),
  clearAuth: vi.fn(),
  ...overrides,
})

beforeEach(() => {
  vi.clearAllMocks()
})

describe('request interceptor — Authorization header', () => {
  it('injects Authorization header when accessToken is set', async () => {
    ;(useAuthStore.getState as ReturnType<typeof vi.fn>).mockReturnValue(
      getMockState({ accessToken: 'my-access-token' })
    )

    const handlers = (apiClient.interceptors.request as any).handlers
    const handler = handlers[handlers.length - 1].fulfilled

    const config = {
      headers: { ...apiClient.defaults.headers },
    } as unknown as InternalAxiosRequestConfig

    const result = await handler(config)
    expect(result.headers['Authorization']).toBe('Bearer my-access-token')
  })

  it('does not inject Authorization when accessToken is null', async () => {
    ;(useAuthStore.getState as ReturnType<typeof vi.fn>).mockReturnValue(
      getMockState({ accessToken: null })
    )

    const handlers = (apiClient.interceptors.request as any).handlers
    const handler = handlers[handlers.length - 1].fulfilled

    const config = {
      headers: { ...apiClient.defaults.headers },
    } as unknown as InternalAxiosRequestConfig

    const result = await handler(config)
    expect(result.headers['Authorization']).toBeUndefined()
  })
})

describe('response interceptor — 401 handling', () => {
  it('calls refreshTokens and retries on 401 when refreshToken is available', async () => {
    const mockRefreshTokens = vi.fn().mockImplementation(() => {
      ;(useAuthStore.getState as ReturnType<typeof vi.fn>).mockReturnValue(
        getMockState({ accessToken: 'new-token', refreshToken: 'new-refresh', refreshTokens: mockRefreshTokens })
      )
      return Promise.resolve()
    })

    ;(useAuthStore.getState as ReturnType<typeof vi.fn>).mockReturnValue(
      getMockState({ accessToken: 'old-token', refreshToken: 'valid-refresh', refreshTokens: mockRefreshTokens })
    )

    const handlers = (apiClient.interceptors.response as any).handlers
    const errorHandler = handlers[handlers.length - 1].rejected

    const requestSpy = vi.spyOn(apiClient, 'request').mockResolvedValueOnce({ data: 'retried' })

    const error = {
      response: { status: 401 },
      config: { _retry: false, headers: {}, url: '/protected', method: 'get' },
    }

    const result = await errorHandler(error)
    expect(mockRefreshTokens).toHaveBeenCalledOnce()
    expect(requestSpy).toHaveBeenCalledOnce()
    expect(result).toEqual({ data: 'retried' })
  })

  it('calls clearAuth and rejects when refreshToken is null', async () => {
    const mockClearAuth = vi.fn()
    ;(useAuthStore.getState as ReturnType<typeof vi.fn>).mockReturnValue(
      getMockState({ accessToken: 'old', refreshToken: null, clearAuth: mockClearAuth })
    )

    const handlers = (apiClient.interceptors.response as any).handlers
    const errorHandler = handlers[handlers.length - 1].rejected

    const error = {
      response: { status: 401 },
      config: { _retry: false, headers: {}, url: '/protected', method: 'get' },
    }

    await expect(errorHandler(error)).rejects.toEqual(error)
    expect(mockClearAuth).toHaveBeenCalledOnce()
  })

  it('calls clearAuth and rejects when refreshTokens throws (replay attack)', async () => {
    const mockClearAuth = vi.fn()
    const mockRefreshTokens = vi.fn().mockRejectedValue(new Error('Token revoked'))

    ;(useAuthStore.getState as ReturnType<typeof vi.fn>).mockReturnValue(
      getMockState({ accessToken: 'old', refreshToken: 'compromised', clearAuth: mockClearAuth, refreshTokens: mockRefreshTokens })
    )

    const handlers = (apiClient.interceptors.response as any).handlers
    const errorHandler = handlers[handlers.length - 1].rejected

    const error = {
      response: { status: 401 },
      config: { _retry: false, headers: {}, url: '/protected', method: 'get' },
    }

    await expect(errorHandler(error)).rejects.toThrow()
    expect(mockClearAuth).toHaveBeenCalledOnce()
  })

  it('does not retry when _retry flag is already set (prevents infinite loop)', async () => {
    const mockRefreshTokens = vi.fn()
    ;(useAuthStore.getState as ReturnType<typeof vi.fn>).mockReturnValue(
      getMockState({ refreshToken: 'token', refreshTokens: mockRefreshTokens })
    )

    const handlers = (apiClient.interceptors.response as any).handlers
    const errorHandler = handlers[handlers.length - 1].rejected

    const error = {
      response: { status: 401 },
      config: { _retry: true, headers: {}, url: '/protected', method: 'get' },
    }

    await expect(errorHandler(error)).rejects.toEqual(error)
    expect(mockRefreshTokens).not.toHaveBeenCalled()
  })

  it('passes through non-401 errors unchanged', async () => {
    const handlers = (apiClient.interceptors.response as any).handlers
    const errorHandler = handlers[handlers.length - 1].rejected

    const error = { response: { status: 500 }, config: { _retry: false } }
    await expect(errorHandler(error)).rejects.toEqual(error)
  })
})
