import { useEffect, useSyncExternalStore } from 'react'
import { usePWA } from '../hooks/usePWA'
import { subscribeToasts, getToasts, dismissToast, flushPendingCommits } from '../services/toast'
import './AppToasts.css'

// 全局 Toast 宿主：常驻的离线/新版本条 + services/toast 推来的临时提示。
export default function AppToasts() {
  const { offline, needRefresh, update, dismissUpdate } = usePWA()
  const toasts = useSyncExternalStore(subscribeToasts, getToasts)

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flushPendingCommits()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  return (
    <div className="app-toasts" role="status" aria-live="polite">
      {offline && (
        <div className="app-toast offline">
          <span className="toast-icon">📡</span>
          <span className="toast-text">离线中 — 联网后才能加载和保存数据</span>
        </div>
      )}
      {needRefresh && (
        <div className="app-toast update">
          <span className="toast-icon">✨</span>
          <span className="toast-text">发现新版本</span>
          <div className="toast-actions">
            <button className="toast-btn dismiss" onClick={dismissUpdate}>稍后</button>
            <button className="toast-btn confirm" onClick={update}>刷新</button>
          </div>
        </div>
      )}
      {toasts.map(t => (
        <div key={t.id} className={`app-toast ${t.tone}`} role={t.tone === 'error' ? 'alert' : undefined}>
          <span className="toast-text">{t.message}</span>
          {t.action ? (
            <div className="toast-actions">
              <button className="toast-btn confirm" onClick={t.action.onClick}>{t.action.label}</button>
            </div>
          ) : (
            <button className="toast-close" onClick={() => dismissToast(t.id)} aria-label="关闭提示">×</button>
          )}
        </div>
      ))}
    </div>
  )
}
