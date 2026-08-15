import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import './LoginPage.css'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
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
    <div className="login-page">
      <form onSubmit={handleSubmit} className="login-card">
        <h1 className="login-brand">FinFlow</h1>
        <p className="login-subtitle">登录以继续</p>
        {error && <div className="login-error">{error}</div>}
        <div className="login-field">
          <input
            className="login-input"
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="用户名"
            autoFocus
            required
          />
        </div>
        <div className="login-field">
          <div className="login-password-wrap">
            <input
              className="login-input"
              type={showPwd ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="密码"
              required
            />
            <button
              type="button"
              className="login-password-toggle"
              onClick={() => setShowPwd(v => !v)}
              aria-label={showPwd ? '隐藏密码' : '显示密码'}
              aria-pressed={showPwd}
              tabIndex={-1}
            >
              {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>
        <button type="submit" className="login-submit" disabled={loading}>
          {loading ? '登录中…' : '登录'}
        </button>
        <p className="login-hint">没有账号？请联系管理员创建</p>
      </form>
    </div>
  )
}

