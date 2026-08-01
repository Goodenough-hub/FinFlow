import { useMemo } from 'react'
import { filterByPeriod, stepPeriod } from '../utils/date'
import type { StatPeriod } from '../utils/date'
import type { Transaction } from '../db/models'
import { asCurrency } from '../utils/format'
import './MonthCompare.css'

interface Props {
  transactions: Transaction[]
  period: StatPeriod
  date: Date
}

export default function MonthCompare({ transactions, period, date }: Props) {
  const { currentPeriod, prevPeriod } = useMemo(() => {
    const prevDate = stepPeriod(date, period, -1)

    const current = filterByPeriod(transactions, period, date)
    const prev = filterByPeriod(transactions, period, prevDate)

    let curInc = 0, curExp = 0
    for (const t of current) {
      if (t.type === 'income') curInc += t.amount
      else if (t.type === 'expense') curExp += t.amount
    }

    let prevInc = 0, prevExp = 0
    for (const t of prev) {
      if (t.type === 'income') prevInc += t.amount
      else if (t.type === 'expense') prevExp += t.amount
    }

    // days in period
    let curDays = 0
    if (period === 'month') {
      curDays = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
    } else {
      curDays = 365
    }

    return {
      currentPeriod: { income: curInc, expense: curExp, days: curDays },
      prevPeriod: { income: prevInc, expense: prevExp, days: curDays }
    }
  }, [transactions, period, date])

  const expenseChange = currentPeriod.expense - prevPeriod.expense
  const expenseChangePct = prevPeriod.expense > 0
    ? Math.round((expenseChange / prevPeriod.expense) * 100)
    : 0

  const incomeChange = currentPeriod.income - prevPeriod.income
  const incomeChangePct = prevPeriod.income > 0
    ? Math.round((incomeChange / prevPeriod.income) * 100)
    : 0

  const curDaily = currentPeriod.expense / currentPeriod.days
  const prevDaily = prevPeriod.expense / prevPeriod.days
  const dailyChange = curDaily - prevDaily
  const dailyChangePct = prevDaily > 0
    ? Math.round((dailyChange / prevDaily) * 100)
    : 0

  const periodLabel = period === 'month' ? '上月' : '去年'

  const items = [
    {
      label: `支出 vs ${periodLabel}`,
      current: currentPeriod.expense,
      change: expenseChange,
      changePct: expenseChangePct,
      isIncome: false
    },
    {
      label: `收入 vs ${periodLabel}`,
      current: currentPeriod.income,
      change: incomeChange,
      changePct: incomeChangePct,
      isIncome: true
    },
    {
      label: '日均支出',
      current: curDaily,
      change: dailyChange,
      changePct: dailyChangePct,
      isIncome: false
    }
  ]

  return (
    <div className="card month-compare">
      {items.map((item, idx) => {
        const isUp = item.change > 0
        const isDown = item.change < 0
        const changeColor = item.isIncome
          ? (isUp ? 'var(--income-green)' : isDown ? 'var(--overspend-red)' : 'var(--text-tertiary)')
          : (isUp ? 'var(--expense-gold)' : isDown ? 'var(--income-green)' : 'var(--text-tertiary)')
        const arrow = isUp ? '↑' : isDown ? '↓' : '→'

        return (
          <div key={item.label} className="mc-row">
            <span className="mc-label">{item.label}</span>
            <div className="mc-values">
              <span className="mc-current">{asCurrency(item.current)}</span>
              <span className="mc-change" style={{ color: changeColor }}>
                <span className="mc-arrow">{arrow}</span>
                {asCurrency(Math.abs(item.change))}
                {item.changePct !== 0 && (
                  <span className="mc-pct"> ({item.changePct}%)</span>
                )}
              </span>
            </div>
            {idx < items.length - 1 && <div className="mc-divider" />}
          </div>
        )
      })}
    </div>
  )
}