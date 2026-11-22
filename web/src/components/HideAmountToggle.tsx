import { Eye, EyeOff } from 'lucide-react'
import { useHideAmount } from '../hooks/useHideAmount'
import './HideAmountToggle.css'

export default function HideAmountToggle() {
  const { hideAmount, setHideAmount } = useHideAmount()
  return (
    <button
      type="button"
      className="eye-btn"
      onClick={() => setHideAmount(!hideAmount)}
      aria-label={hideAmount ? '显示金额' : '隐藏金额'}
    >
      {hideAmount ? <EyeOff size={18} strokeWidth={2} /> : <Eye size={18} strokeWidth={2} />}
    </button>
  )
}
