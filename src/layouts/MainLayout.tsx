import { NavLink, Outlet } from 'react-router-dom'
import './MainLayout.css'

const tabs = [
  { to: '/', label: '首页', icon: '🏠' },
  { to: '/transactions', label: '账单', icon: '📋' },
  { to: '/accounts', label: '资产', icon: '💳' },
  { to: '/settings', label: '设置', icon: '⚙️' }
]

export default function MainLayout() {
  return (
    <div className="app-shell">
      <main className="app-main">
        <Outlet />
      </main>
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
