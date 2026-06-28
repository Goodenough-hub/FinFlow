import type { Transaction } from '../db/models'
import { useCategories, useAccounts } from '../hooks/useLookup'
import { asCurrency } from '../utils/format'
import CategoryIcon from './CategoryIcon'
import './TransactionRow.css'

interface Props {
  transaction: Transaction
  showDate?: boolean
}

export default function TransactionRow({ transaction: t, showDate = false }: Props) {
  const { byId: cats } = useCategories()
  const { byId: accs } = useAccounts()
  const cat = t.categoryId ? cats.get(t.categoryId) : undefined
  const acc = t.accountId ? accs.get(t.accountId) : undefined
  const toAcc = t.toAccountId ? accs.get(t.toAccountId) : undefined

  const isIncome = t.type === 'income'
  const isTransfer = t.type === 'transfer'
  const sign = isIncome ? '+' : isTransfer ? '' : '-'
  const color = isIncome ? 'var(--income-green)' : isTransfer ? 'var(--transfer-blue)' : 'var(--expense-gold)'

  let title: string
  let subtitle: string
  let icon: string
  let iconColor: string

  if (isTransfer) {
    const from = acc?.name ?? '?'
    const to = toAcc?.name ?? '?'
    title = `${from} → ${to}`
    subtitle = t.note || ''
    icon = '🔄'
    iconColor = '#5B8DEF'
  } else {
    const baseName = cat?.name ?? '未分类'
    title = t.vendor ? `${baseName} · ${t.vendor}` : baseName
    subtitle = t.note || ''
    icon = cat?.icon ?? '💸'
    iconColor = cat?.colorHex ?? '#6B7280'
  }

  const timeLabel = formatTimeLabel(t.date, t.time, showDate)

  return (
    <div className="tx-row">
      <CategoryIcon icon={icon} color={iconColor} size={36} />
      <div className="tx-info">
        <div className="tx-title">{title}</div>
        {subtitle && <div className="tx-subtitle">{subtitle}</div>}
      </div>
      <div className="tx-right">
        <div className="tx-amount" style={{ color }}>
          {sign}{asCurrency(t.amount)}
        </div>
        {timeLabel && <div className="tx-time">{timeLabel}</div>}
      </div>
    </div>
  )
}

function formatTimeLabel(dateStr: string, time: string | undefined, showDate: boolean): string {
  if (showDate) {
    const [, m, d] = dateStr.split('-').map(Number)
    const datePart = `${m}/${d}`
    return time ? `${datePart} ${time}` : datePart
  }
  return time ?? ''
}

export function TransactionRowSkeleton() {
  return <div className="tx-row skeleton" />
}
