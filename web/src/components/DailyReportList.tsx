import { useMemo, useState } from 'react'
import type { Transaction } from '../db/models'
import { asCurrency } from '../utils/format'
import { parseISODate } from '../utils/date'
import './DailyReportList.css'

interface Props {
  transactions: Transaction[]
}

interface DayGroup {
  date: string
  income: number
  expense: number
  count: number
}

export default function DailyReportList({ transactions }: Props) {
  const [expanded, setExpanded] = useState(false)

  const groups = useMemo<DayGroup[]>(() => {
    const map = new Map<string, DayGroup>()
    for (const t of transactions) {
      let g = map.get(t.date)
      if (!g) {
        g = { date: t.date, income: 0, expense: 0, count: 0 }
        map.set(t.date, g)
      }
      if (t.type === 'income') g.income += t.amount
      else if (t.type === 'expense') g.expense += t.amount
      g.count += 1
    }
    return Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date))
  }, [transactions])

  if (groups.length === 0) return null

  return (
    <div className="card daily-report">
      <button
        className="daily-report-head"
        onClick={() => setExpanded(v => !v)}
      >
        <span className="daily-report-title">日报表</span>
        <span className="daily-report-meta">
          <span className="daily-report-count">{groups.length} 天</span>
          <span className={`daily-report-chevron ${expanded ? 'up' : ''}`}>›</span>
        </span>
      </button>

      {expanded && (
        <div className="daily-report-list">
          {groups.map(g => {
            const d = parseISODate(g.date)
            const dateLabel = `${d.getMonth() + 1}/${d.getDate()}`
            const net = g.income - g.expense
            return (
              <div key={g.date} className="daily-report-row">
                <div className="daily-report-row-head">
                  <span className="daily-report-date">{dateLabel}</span>
                  <span className="daily-report-txcount">{g.count} 笔</span>
                </div>
                <div className="daily-report-row-amounts">
                  <span className="daily-report-inc">↑ {asCurrency(g.income)}</span>
                  <span className="daily-report-exp">↓ {asCurrency(g.expense)}</span>
                  <span className="daily-report-net">{net >= 0 ? '+' : '-'}{asCurrency(Math.abs(net))}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
