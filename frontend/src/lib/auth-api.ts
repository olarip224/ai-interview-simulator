import axios from 'axios'
import type {
  RegisterRequest,
  LoginRequest,
  RefreshRequest,
  LogoutRequest,
  AuthResponse,
  UserResponse,
} from '@/types/auth'

// Own bare instance — no interceptors. Auth endpoints don't need Bearer headers,
// and the refresh call must bypass the 401 interceptor to avoid infinite loops.
const authAxios = axios.create({
  baseURL: `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
})

export async function apiRegister(data: RegisterRequest): Promise<AuthResponse> {
  const response = await authAxios.post<AuthResponse>('/auth/register', data)
  return response.data
}

export async function apiLogin(data: LoginRequest): Promise<AuthResponse> {
  const response = await authAxios.post<AuthResponse>('/auth/login', data)
  return response.data
}

export async function apiRefresh(data: RefreshRequest): Promise<AuthResponse> {
  const response = await authAxios.post<AuthResponse>('/auth/refresh', data)
  return response.data
}

export async function apiLogout(data: LogoutRequest): Promise<void> {
  await authAxios.post<void>('/auth/logout', data)
}

export async function apiGetMe(): Promise<UserResponse> {
  const response = await authAxios.get<UserResponse>('/auth/me')
  return response.data
}
