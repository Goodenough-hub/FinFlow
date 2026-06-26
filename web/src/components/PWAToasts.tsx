import { usePWA } from '../hooks/usePWA'
import './PWAToasts.css'

export default function PWAToasts() {
  const { offline, needRefresh, update, dismissUpdate } = usePWA()

  return (
    <div className="pwa-toasts">
      {offline && (
        <div className="pwa-toast offline">
          <span className="toast-icon">📡</span>
          <span className="toast-text">离线模式 — 数据存储在本设备，可继续记账</span>
        </div>
      )}
      {needRefresh && (
        <div className="pwa-toast update">
          <span className="toast-icon">✨</span>
          <span className="toast-text">发现新版本</span>
          <div className="toast-actions">
            <button className="toast-btn dismiss" onClick={dismissUpdate}>稍后</button>
            <button className="toast-btn confirm" onClick={update}>刷新</button>
          </div>
        </div>
      )}
    </div>
  )
}
