import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import './MainLayout.css'

const tabs = [
  { to: '/', label: '首页', icon: '🏠' },
  { to: '/transactions', label: '账单', icon: '📋' },
  { to: '/accounts', label: '资产', icon: '💳' },
  { to: '/settings', label: '我的', icon: '👤' }
]

const FAB_ROUTES = ['/', '/transactions']

export default function MainLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const showFab = FAB_ROUTES.includes(location.pathname)

  return (
    <div className="app-shell">
      <main className="app-main">
        <Outlet />
      </main>
      {showFab && (
        <button
          className="fab"
          onClick={() => navigate('/transactions/new')}
          aria-label="记一笔"
        >
          <span className="fab-plus">+</span>
        </button>
      )}
      <nav className="tab-bar">
        {tabs.map(t => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.to === '/'}
            className={({ isActive }) => `tab-item ${isActive ? 'active' : ''}`}
          >
            <span className="tab-icon">{t.icon}</span>
            <span className="tab-label">{t.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
