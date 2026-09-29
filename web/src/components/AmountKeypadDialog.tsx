import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import NumericKeypad from './NumericKeypad'
import './AmountKeypadDialog.css'

interface Props {
  open: boolean
  value: string
  onChange: (next: string) => void
  onClose: () => void
}

export default function AmountKeypadDialog({ open, value, onChange, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const mounted = useRef(false)
  const backdropPress = useRef(false)
  const titleId = useId()

  useEffect(() => {
    const dialog = dialogRef.current!
    backdropPress.current = false
    // showModal 将键盘放入浏览器 top layer，并使背景页面不可交互。
    if (open && !dialog.open) dialog.showModal()
    else if (!open && dialog.open) dialog.close()
  }, [open])

  useEffect(() => {
    const dialog = dialogRef.current!
    mounted.current = true
    return () => {
      mounted.current = false
      if (dialog.open) dialog.close()
    }
  }, [])

  return createPortal(
    <dialog
      ref={dialogRef}
      className="amount-keypad-dialog"
      aria-labelledby={titleId}
      aria-modal="true"
      onCancel={e => {
        e.preventDefault()
        onClose()
      }}
      onClose={e => {
        // 忽略 StrictMode 的关闭/重开产生的延迟 close 事件。
        if (mounted.current && !e.currentTarget.open && open) onClose()
      }}
      onPointerDown={e => {
        backdropPress.current = e.target === e.currentTarget
      }}
      onPointerCancel={() => { backdropPress.current = false }}
      onClick={e => {
        e.stopPropagation()
        const dismiss = backdropPress.current && e.target === e.currentTarget
        backdropPress.current = false
        // 等完整点击结束再收起，且从按键滑到遮罩不视为关闭。
        if (dismiss) onClose()
      }}
    >
      <div className="amount-keypad-panel">
        <div className="amount-keypad-header">
          <h2 id={titleId}>输入金额</h2>
          <button type="button" className="amount-keypad-done" onClick={onClose} autoFocus>
            完成
          </button>
        </div>
        <output className="amount-keypad-value" aria-label="当前金额">¥ {value || '0.00'}</output>
        <NumericKeypad value={value} onChange={onChange} />
      </div>
    </dialog>,
    document.body
  )
}
