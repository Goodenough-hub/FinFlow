import { apiClient } from './client'

export interface LoginRequest {
  username: string
  password: string
}

export interface AuthInfo {
  token: string
  expiresAt: number
  userId: string
  role: string
  appScope: string[]
  username: string
  avatar: string
}

export async function login(req: LoginRequest): Promise<AuthInfo> {
  const { data } = await apiClient.post<AuthInfo>('/auth/login', req)
  return data
}

export async function refresh(): Promise<AuthInfo> {
  const { data } = await apiClient.post<AuthInfo>('/auth/refresh')
  return data
}

export async function updateAvatar(avatar: string): Promise<{ avatar: string }> {
  const { data } = await apiClient.put<{ avatar: string }>('/auth/avatar', { avatar })
  return data
}
