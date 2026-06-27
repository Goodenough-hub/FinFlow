import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function ProtectedRoute() {
  const { user, loading } = useAuth()
  if (loading) return <div style={{ padding: 24, textAlign: 'center' }}>加载中…</div>
  if (!user) return <Navigate to="/login" replace />
  return <Outlet />
}
