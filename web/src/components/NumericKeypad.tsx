import { applyKeypadKey } from '../utils/keypad'
import './NumericKeypad.css'

interface Props {
  value: string
  onChange: (next: string) => void
  onSubmit?: () => void
  submitLabel?: string
  submitDisabled?: boolean
}

// 3 列数字键盘：1-9 / . 0 ⌫，下方一个全宽提交键。
// 输入逻辑走 utils/keypad.ts 的纯函数，组件只负责渲染。
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'back']

export default function NumericKeypad({
  value,
  onChange,
  onSubmit,
  submitLabel = '保存',
  submitDisabled = false,
}: Props) {
  return (
    <div className="keypad" onMouseDown={e => e.preventDefault()}>
      <div className="keypad-grid">
        {KEYS.map(k => (
          <button
            key={k}
            type="button"
            className={`keypad-key${k === 'back' ? ' keypad-key-back' : ''}`}
            aria-label={k === 'back' ? '退格' : k === '.' ? '小数点' : k}
            onClick={() => onChange(applyKeypadKey(value, k))}
          >
            {k === 'back' ? '⌫' : k}
          </button>
        ))}
      </div>
      {onSubmit && (
        <button
          type="button"
          className="keypad-submit"
          disabled={submitDisabled}
          onClick={onSubmit}
        >
          {submitLabel}
        </button>
      )}
    </div>
  )
}
