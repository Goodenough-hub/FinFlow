import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { login as apiLogin, refresh as apiRefresh, type AuthInfo } from '../api/auth'
import { tokenStorage } from '../api/client'
import { refreshAllLookups } from '../hooks/useLookup'

interface AuthContextValue {
  user: AuthInfo | null
  loading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  setAvatar: (avatar: string) => void
}

const AuthContext = createContext<AuthContextValue>(null!)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = tokenStorage.get()
    if (!token) {
      setLoading(false)
      return
    }
    apiRefresh()
      .then(info => {
        tokenStorage.set(info.token)
        setUser(info)
        refreshAllLookups()
      })
      .catch(() => {
        tokenStorage.clear()
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, [])

  const login = async (username: string, password: string) => {
    const info = await apiLogin({ username, password })
    tokenStorage.set(info.token)
    setUser(info)
    refreshAllLookups()
  }

  const logout = () => {
    tokenStorage.clear()
    setUser(null)
  }

  const setAvatar = (avatar: string) => {
    setUser(prev => prev ? { ...prev, avatar } : prev)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, setAvatar }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
