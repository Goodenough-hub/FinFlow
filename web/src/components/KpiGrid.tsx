import type { StatPeriod } from '../utils/date'
import type { PeriodTotals } from '../utils/stats'
import { pctChange, savingsRate } from '../utils/stats'
import { asCurrency, formatPercent } from '../utils/format'
import './KpiGrid.css'

interface Props {
  current: PeriodTotals
  previous: PeriodTotals
  period: StatPeriod
}

interface Cell {
  key: string
  label: string
  value: string
  valueColor: string
  change: number | null
  /** true = 上升为好事（收入/结余/结余率），false = 下降为好事（支出） */
  upIsGood: boolean
  /** 结余率用百分点差而不是相对百分比 */
  unit: '%' | 'pp'
}

function ChangeLine({ cell, periodLabel }: { cell: Cell; periodLabel: string }) {
  if (cell.change === null) {
    return <div className="kpi-change muted">较{periodLabel} —</div>
  }
  const good = cell.upIsGood ? cell.change >= 0 : cell.change <= 0
  const sign = cell.change > 0 ? '+' : ''
  return (
    <div className={`kpi-change ${good ? 'good' : 'bad'}`}>
      较{periodLabel} {sign}{cell.change.toFixed(1)}{cell.unit === 'pp' ? 'pp' : '%'}
    </div>
  )
}

export default function KpiGrid({ current, previous, period }: Props) {
  const balance = current.income - current.expense
  const prevBalance = previous.income - previous.expense
  const rate = savingsRate(current.income, current.expense)
  const prevRate = savingsRate(previous.income, previous.expense)

  const cells: Cell[] = [
    {
      key: 'income',
      label: period === 'month' ? '本月收入' : '本年收入',
      value: asCurrency(current.income),
      valueColor: 'var(--income-green)',
      change: pctChange(current.income, previous.income),
      upIsGood: true,
      unit: '%'
    },
    {
      key: 'expense',
      label: period === 'month' ? '本月支出' : '本年支出',
      value: asCurrency(current.expense),
      valueColor: 'var(--expense-gold)',
      change: pctChange(current.expense, previous.expense),
      upIsGood: false,
      unit: '%'
    },
    {
      key: 'balance',
      label: '结余',
      value: asCurrency(balance),
      valueColor: balance >= 0 ? 'var(--income-green)' : 'var(--overspend-red)',
      change: pctChange(balance, prevBalance),
      upIsGood: true,
      unit: '%'
    },
    {
      key: 'rate',
      label: '结余率',
      value: rate === null ? '—' : formatPercent(rate),
      valueColor: 'var(--accent-blue)',
      change: rate !== null && prevRate !== null ? rate - prevRate : null,
      upIsGood: true,
      unit: 'pp'
    }
  ]

  const periodLabel = period === 'month' ? '上月' : '去年'

  return (
    <div className="kpi-grid">
      {cells.map(cell => (
        <div key={cell.key} className="card kpi-cell" data-kpi={cell.key}>
          <div className="kpi-label">{cell.label}</div>
          <div className="kpi-value" style={{ color: cell.valueColor }}>{cell.value}</div>
          <ChangeLine cell={cell} periodLabel={periodLabel} />
        </div>
      ))}
    </div>
  )
}
