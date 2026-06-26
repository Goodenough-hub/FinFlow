import { asCurrency } from '../utils/format'
import './SummaryCard.css'

interface Props {
  income: number
  expense: number
  balance: number
}

export default function SummaryCard({ income, expense, balance }: Props) {
  const balanceColor = balance >= 0 ? 'var(--income-green)' : 'var(--overspend-red)'
  const balanceIcon = balance >= 0 ? '↗' : '↘'

  return (
    <div className="card summary-card">
      <div className="summary-balance-row">
        <span className="summary-label">本期结余</span>
        <span className="summary-arrow" style={{ color: balanceColor }}>
          {balanceIcon}
        </span>
      </div>
      <div className="summary-balance" style={{ color: balanceColor }}>
        {asCurrency(balance)}
      </div>

      <div className="summary-stats">
        <div className="summary-stat">
          <div className="summary-stat-label">
            <span style={{ color: 'var(--income-green)' }}>↑</span>
            收入
          </div>
          <div className="summary-stat-amount" style={{ color: 'var(--income-green)' }}>
            {asCurrency(income)}
          </div>
        </div>
        <div className="summary-divider" />
        <div className="summary-stat">
          <div className="summary-stat-label">
            <span style={{ color: 'var(--expense-gold)' }}>↓</span>
            支出
          </div>
          <div className="summary-stat-amount" style={{ color: 'var(--expense-gold)' }}>
            {asCurrency(expense)}
          </div>
        </div>
      </div>
    </div>
  )
}
