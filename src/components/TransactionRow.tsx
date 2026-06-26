import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import type { Transaction } from '../db/models'
import { asCurrency } from '../utils/format'
import CategoryIcon from './CategoryIcon'
import './TransactionRow.css'

interface Props {
  transaction: Transaction
  showDate?: boolean
}

export default function TransactionRow({ transaction: t, showDate = false }: Props) {
  const cat = useLiveQuery(
    async () => (t.categoryId ? await db.categories.get(t.categoryId) : undefined),
    [t.categoryId]
  )
  const acc = useLiveQuery(
    async () => (t.accountId ? await db.accounts.get(t.accountId) : undefined),
    [t.accountId]
  )

  const isIncome = t.type === 'income'
  const sign = isIncome ? '+' : t.type === 'expense' ? '-' : ''
  const color = isIncome ? 'var(--income-green)' : t.type === 'expense' ? 'var(--expense-gold)' : 'var(--transfer-blue)'

  const title = t.note || cat?.name || '未分类'
  const subtitleParts: string[] = []
  if (showDate) subtitleParts.push(t.date)
  if (cat?.name) subtitleParts.push(cat.name)
  if (acc?.name) subtitleParts.push(acc.name)
  const subtitle = subtitleParts.join(' · ') || '—'

  return (
    <div className="tx-row">
      <CategoryIcon
        icon={cat?.icon ?? '💸'}
        color={cat?.colorHex ?? '#6B7280'}
        size={36}
      />
      <div className="tx-info">
        <div className="tx-title">{title}</div>
        <div className="tx-subtitle">{subtitle}</div>
      </div>
      <div className="tx-amount" style={{ color }}>
        {sign}{asCurrency(t.amount)}
      </div>
    </div>
  )
}

export function TransactionRowSkeleton() {
  return <div className="tx-row skeleton" />
}
