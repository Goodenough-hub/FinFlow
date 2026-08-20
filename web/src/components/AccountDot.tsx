import type { CSSProperties } from 'react'
import type { AccountType } from '../db/models'
import { accountTypeIcon, accountTypeColor } from '../db/models'
import './AccountDot.css'

interface Props {
  type: AccountType
  icon: string
  colorHex: string
  size?: number
}

export default function AccountDot({ type, icon, colorHex, size = 32 }: Props) {
  const displayIcon = icon || accountTypeIcon[type] || '卡'
  const bg = colorHex || accountTypeColor[type] || 'var(--accent-blue)'
  const style: CSSProperties = {
    width: size,
    height: size,
    borderRadius: Math.round(size * 0.31),
    fontSize: Math.round(size * 0.44),
    background: bg
  }
  return (
    <span className="account-dot" style={style}>
      {displayIcon}
    </span>
  )
}
