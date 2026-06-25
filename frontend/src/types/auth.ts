// ─── Request shapes ────────────────────────────────────────────────────────

export interface RegisterRequest {
  email: string
  username: string
  password: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RefreshRequest {
  refresh_token: string
}

export interface LogoutRequest {
  refresh_token: string
}

// ─── Response shapes ───────────────────────────────────────────────────────

/** Returned by /register, /login, /refresh */
export interface AuthResponse {
  access_token: string
  refresh_token: string
  token_type: 'bearer'
  user: AuthUser
}

export interface AuthUser {
  id: string
  email: string
  username: string
}

/** Returned by GET /auth/me */
export interface UserResponse {
  id: string         // UUID
  email: string
  username: string
  is_active: boolean
  is_verified: boolean
  created_at: string // ISO 8601
}

// ─── Error shapes ──────────────────────────────────────────────────────────

export interface ValidationErrorDetail {
  loc: (string | number)[]
  msg: string
  type: string
}

/** 400 / 401 / 409 / 429 response body */
export interface ApiErrorResponse {
  detail: string | ValidationErrorDetail[]
}

// ─── Zustand store shape ───────────────────────────────────────────────────

export interface AuthState {
  user: AuthUser | null
  accessToken: string | null
  refreshToken: string | null
  login: (credentials: LoginRequest) => Promise<void>
  register: (data: RegisterRequest) => Promise<void>
  logout: () => Promise<void>
  refreshTokens: () => Promise<void>
  setTokens: (access: string, refresh: string, user: AuthUser) => void
  clearAuth: () => void
}
