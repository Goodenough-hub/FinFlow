import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Home, Receipt, Wallet, User, Plus } from 'lucide-react'
import GlassTabBar, { type TabDef } from './GlassTabBar'
import './MainLayout.css'

const tabs: TabDef[] = [
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
      <GlassTabBar tabs={tabs} />
    </div>
  )
}
