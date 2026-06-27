import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(username, password)
      navigate('/')
    } catch (err: any) {
      setError(err.response?.data?.error || '登录失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg, #0F0F11)',
      color: 'var(--text, #E5E5E8)',
      padding: 16
    }}>
      <form onSubmit={handleSubmit} style={{
        width: '100%',
        maxWidth: 320,
        background: 'var(--surface, #1A1A1F)',
        padding: 32,
        borderRadius: 12,
        border: '1px solid var(--border, #2E2E36)'
      }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 8, textAlign: 'center' }}>FinFlow</h1>
        <p style={{ fontSize: 13, color: 'var(--text-dim, #9CA3AF)', textAlign: 'center', marginBottom: 24 }}>登录以继续</p>
        {error && <div style={{ color: '#EF4444', marginBottom: 12, fontSize: 13, textAlign: 'center' }}>{error}</div>}
        <div style={{ marginBottom: 12 }}>
          <input
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="用户名"
            autoFocus
            required
            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border, #2E2E36)', background: 'var(--bg, #0F0F11)', color: 'var(--text, #E5E5E8)', fontSize: 14 }}
          />
        </div>
        <div style={{ marginBottom: 20 }}>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="密码"
            required
            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border, #2E2E36)', background: 'var(--bg, #0F0F11)', color: 'var(--text, #E5E5E8)', fontSize: 14 }}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '10px 16px',
            borderRadius: 8,
            border: 'none',
            background: 'var(--primary, #3B82F6)',
            color: 'white',
            fontSize: 14,
            fontWeight: 500,
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? '登录中…' : '登录'}
        </button>
        <p style={{ fontSize: 12, color: 'var(--text-dim, #9CA3AF)', textAlign: 'center', marginTop: 16 }}>
          没有账号？请联系管理员创建
        </p>
      </form>
    </div>
  )
}
