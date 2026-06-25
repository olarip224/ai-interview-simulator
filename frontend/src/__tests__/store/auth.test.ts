import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth-api', () => ({
  apiLogin: vi.fn(),
  apiRegister: vi.fn(),
  apiRefresh: vi.fn(),
  apiLogout: vi.fn(),
  apiGetMe: vi.fn(),
}))

// Mock document.cookie
const cookieJar: Record<string, string> = {}
Object.defineProperty(document, 'cookie', {
  get: () => Object.entries(cookieJar).map(([k, v]) => `${k}=${v}`).join('; '),
  set: (val: string) => {
    const [kv] = val.split(';')
    const [key, value = ''] = kv.split('=')
    if (val.includes('expires=Thu, 01 Jan 1970')) {
      delete cookieJar[key.trim()]
    } else {
      cookieJar[key.trim()] = value.trim()
    }
  },
  configurable: true,
})

const { useAuthStore } = await import('@/store/auth')
const authApi = await import('@/lib/auth-api')

const mockAuthResponse = {
  access_token: 'access-xyz',
  refresh_token: 'refresh-xyz',
  token_type: 'bearer' as const,
  user: { id: 'user-123', email: 'test@example.com', username: 'testuser' },
}

beforeEach(() => {
  useAuthStore.setState({ user: null, accessToken: null, refreshToken: null })
  vi.clearAllMocks()
  Object.keys(cookieJar).forEach((k) => delete cookieJar[k])
})

describe('initial state', () => {
  it('starts with null user, accessToken, refreshToken', () => {
    const { user, accessToken, refreshToken } = useAuthStore.getState()
    expect(user).toBeNull()
    expect(accessToken).toBeNull()
    expect(refreshToken).toBeNull()
  })
})

describe('login action', () => {
  it('calls apiLogin and sets tokens + user', async () => {
    ;(authApi.apiLogin as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockAuthResponse)

    await useAuthStore.getState().login({ email: 'test@example.com', password: 'pass123' })

    expect(authApi.apiLogin).toHaveBeenCalledWith({ email: 'test@example.com', password: 'pass123' })
    const { accessToken, refreshToken, user } = useAuthStore.getState()
    expect(accessToken).toBe('access-xyz')
    expect(refreshToken).toBe('refresh-xyz')
    expect(user).toEqual(mockAuthResponse.user)
  })

  it('sets is_authenticated cookie on success', async () => {
    ;(authApi.apiLogin as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockAuthResponse)
    await useAuthStore.getState().login({ email: 'test@example.com', password: 'pass123' })
    expect(cookieJar['is_authenticated']).toBe('1')
  })

  it('throws and does not mutate state on API error', async () => {
    ;(authApi.apiLogin as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Invalid credentials'))
    await expect(useAuthStore.getState().login({ email: 'bad@example.com', password: 'wrong' })).rejects.toThrow()
    expect(useAuthStore.getState().accessToken).toBeNull()
  })
})

describe('register action', () => {
  it('calls apiRegister and sets tokens + user', async () => {
    ;(authApi.apiRegister as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockAuthResponse)

    await useAuthStore.getState().register({ email: 'new@example.com', username: 'newuser', password: 'strongpass' })

    expect(authApi.apiRegister).toHaveBeenCalledWith({ email: 'new@example.com', username: 'newuser', password: 'strongpass' })
    expect(useAuthStore.getState().accessToken).toBe('access-xyz')
    expect(useAuthStore.getState().user?.username).toBe('testuser')
  })

  it('sets is_authenticated cookie on success', async () => {
    ;(authApi.apiRegister as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockAuthResponse)
    await useAuthStore.getState().register({ email: 'new@example.com', username: 'newuser', password: 'pass' })
    expect(cookieJar['is_authenticated']).toBe('1')
  })

  it('throws on 409 without mutating state', async () => {
    const err = Object.assign(new Error('Conflict'), { response: { status: 409 } })
    ;(authApi.apiRegister as ReturnType<typeof vi.fn>).mockRejectedValueOnce(err)
    await expect(useAuthStore.getState().register({ email: 'taken@example.com', username: 'taken', password: 'pass' })).rejects.toThrow()
    expect(useAuthStore.getState().accessToken).toBeNull()
  })
})

describe('logout action', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: mockAuthResponse.user,
      accessToken: 'access-xyz',
      refreshToken: 'refresh-xyz',
    })
    cookieJar['is_authenticated'] = '1'
  })

  it('calls apiLogout with current refreshToken and clears state', async () => {
    ;(authApi.apiLogout as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined)

    await useAuthStore.getState().logout()

    expect(authApi.apiLogout).toHaveBeenCalledWith({ refresh_token: 'refresh-xyz' })
    const { user, accessToken, refreshToken } = useAuthStore.getState()
    expect(user).toBeNull()
    expect(accessToken).toBeNull()
    expect(refreshToken).toBeNull()
  })

  it('clears is_authenticated cookie', async () => {
    ;(authApi.apiLogout as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined)
    await useAuthStore.getState().logout()
    expect(cookieJar['is_authenticated']).toBeUndefined()
  })

  it('clears state even when apiLogout throws (network error)', async () => {
    ;(authApi.apiLogout as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network error'))
    await useAuthStore.getState().logout()
    expect(useAuthStore.getState().accessToken).toBeNull()
  })
})

describe('refreshTokens action', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: mockAuthResponse.user,
      accessToken: 'old-access',
      refreshToken: 'old-refresh',
    })
  })

  it('calls apiRefresh with current refreshToken and updates state', async () => {
    const newResp = { ...mockAuthResponse, access_token: 'new-access', refresh_token: 'new-refresh' }
    ;(authApi.apiRefresh as ReturnType<typeof vi.fn>).mockResolvedValueOnce(newResp)

    await useAuthStore.getState().refreshTokens()

    expect(authApi.apiRefresh).toHaveBeenCalledWith({ refresh_token: 'old-refresh' })
    expect(useAuthStore.getState().accessToken).toBe('new-access')
    expect(useAuthStore.getState().refreshToken).toBe('new-refresh')
  })

  it('throws immediately when refreshToken is null', async () => {
    useAuthStore.setState({ refreshToken: null })
    await expect(useAuthStore.getState().refreshTokens()).rejects.toThrow()
    expect(authApi.apiRefresh).not.toHaveBeenCalled()
  })
})
