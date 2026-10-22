import { asCurrency, formatPercent } from '../utils/format'
import './IncomeAllocationBar.css'

interface Props {
  income: number
  expense: number
}

export default function IncomeAllocationBar({ income, expense }: Props) {
  if (income <= 0 && expense <= 0) return null

  const balance = income - expense
  const overspent = balance < 0
  // 收入为 0 但有支出时按全部超支展示
  const expensePct = income > 0 ? Math.min((expense / income) * 100, 100) : 100
  const savingPct = 100 - expensePct

  return (
    <div className="card alloc-card">
      <div className="alloc-header">
        <span className="alloc-title">收入分配</span>
        {!overspent && income > 0 && (
          <span className="alloc-legend">
            <span className="alloc-legend-item">
              <i className="alloc-dot" style={{ background: 'var(--expense-gold)' }} />
              支出 {formatPercent(expensePct)}
            </span>
            <span className="alloc-legend-item">
              <i className="alloc-dot" style={{ background: 'var(--income-green)' }} />
              结余 {formatPercent(savingPct)}
            </span>
          </span>
        )}
        {overspent && (
          <span className="alloc-legend-item overspent">
            超支 {asCurrency(-balance)}
          </span>
        )}
      </div>

      <div className="alloc-bar" role="img" aria-label={`支出占收入 ${formatPercent(expensePct)}`}>
        <div
          className="alloc-seg expense"
          style={{ width: `${expensePct}%` }}
        />
        {savingPct > 0 && (
          <div
            className="alloc-seg saving"
            style={{ width: `${savingPct}%` }}
          />
        )}
      </div>

      {income > 0 && (
        <div className="alloc-caption">
          本期收入 {asCurrency(income)} = 支出 {asCurrency(expense)} + 结余 {asCurrency(balance)}
        </div>
      )}
      {income <= 0 && (
        <div className="alloc-caption">本期无收入记录，支出 {asCurrency(expense)}</div>
      )}
    </div>
  )
}
