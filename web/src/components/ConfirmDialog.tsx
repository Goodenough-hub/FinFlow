import { useEffect } from 'react'
import './ConfirmDialog.css'

interface Props {
  message: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel: () => void
}

// 应用内确认框：替代 window.confirm（iOS PWA 独立模式下原生 confirm 静默失效，
// 导致「先确认再删除」的流程表现为按钮没反应）。遮罩点击 / Escape 视为取消。
export default function ConfirmDialog({
  message,
  confirmText = '删除',
  cancelText = '取消',
  onConfirm,
  onCancel
}: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  return (
    <div className="confirm-overlay" onClick={onCancel} role="presentation">
      <div
        className="confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-label={message}
        onClick={e => e.stopPropagation()}
      >
        <p className="confirm-message">{message}</p>
        <div className="confirm-actions">
          <button type="button" className="confirm-btn cancel" onClick={onCancel} autoFocus>
            {cancelText}
          </button>
          <button type="button" className="confirm-btn danger" onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
