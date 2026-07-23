import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Home, Receipt, Wallet, User, Plus, type LucideIcon } from 'lucide-react'
import './MainLayout.css'

const tabs: { to: string; label: string; icon: LucideIcon }[] = [
  { to: '/', label: '首页', icon: Home },
  { to: '/transactions', label: '账单', icon: Receipt },
  { to: '/accounts', label: '资产', icon: Wallet },
  { to: '/settings', label: '我的', icon: User }
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
          <Plus className="fab-plus" size={28} strokeWidth={2.5} />
        </button>
      )}
      <nav className="tab-bar">
        {tabs.map(t => {
          const Icon = t.icon
          return (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.to === '/'}
              className={({ isActive }) => `tab-item ${isActive ? 'active' : ''}`}
            >
              <span className="tab-icon"><Icon size={23} strokeWidth={2} /></span>
              <span className="tab-label">{t.label}</span>
            </NavLink>
          )
        })}
      </nav>
    </div>
  )
}
