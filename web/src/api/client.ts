import axios, { type AxiosRequestConfig, type AxiosError } from 'axios'
import type { AuthInfo } from './auth'

const TOKEN_KEY = 'finflow_token'

export const apiClient = axios.create({
  baseURL: '/api/v1',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' }
})

apiClient.interceptors.request.use(config => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

let isRefreshing = false
let pendingQueue: Array<(token: string) => void> = []

function redirectToLogin() {
  localStorage.removeItem(TOKEN_KEY)
  if (!window.location.pathname.endsWith('/login')) {
    window.location.href = '/login'
  }
}

apiClient.interceptors.response.use(
  response => response,
  async (error: AxiosError) => {
    const original = error.config as (AxiosRequestConfig & { _retried?: boolean }) | undefined
    const url = (original?.url as string) ?? ''
    const isAuthEndpoint = url.includes('/auth/login') || url.includes('/auth/refresh')
    const status = error.response?.status

    if (status === 401 && original && !original._retried && !isAuthEndpoint) {
      if (isRefreshing) {
        return new Promise(resolve => {
          pendingQueue.push(token => {
            original._retried = true
            original.headers = { ...original.headers, Authorization: `Bearer ${token}` }
            resolve(apiClient(original))
          })
        })
      }
      isRefreshing = true
      try {
        const { data } = await axios.post<AuthInfo>('/api/v1/auth/refresh', null, {
          headers: { Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}` }
        })
        localStorage.setItem(TOKEN_KEY, data.token)
        pendingQueue.forEach(fn => fn(data.token))
        pendingQueue = []
        original._retried = true
        original.headers = { ...original.headers, Authorization: `Bearer ${data.token}` }
        return apiClient(original)
      } catch {
        pendingQueue = []
        redirectToLogin()
        return Promise.reject(error)
      } finally {
        isRefreshing = false
      }
    }

    if (status === 401 && isAuthEndpoint) {
      redirectToLogin()
    }
    return Promise.reject(error)
  }
)

export const tokenStorage = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY)
}
