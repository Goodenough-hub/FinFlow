import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Transaction } from '../db/models'
import { formatCompact } from '../utils/format'
import { toISODate, parseISODate } from '../utils/date'
import TransactionRow from './TransactionRow'
import './CalendarView.css'

interface Props {
  transactions: Transaction[]
  month: Date
  onMonthChange: (m: Date) => void
  onSelectDay: (date: Date, dayTransactions: Transaction[]) => void
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

export default function CalendarView({ transactions, month, onMonthChange, onSelectDay }: Props) {
  const [selected, setSelected] = useState<string | null>(null)

  const byDay = useMemo(() => {
    const map = new Map<string, { income: number; expense: number; items: Transaction[] }>()
    for (const t of transactions) {
      let entry = map.get(t.date)
      if (!entry) {
        entry = { income: 0, expense: 0, items: [] }
        map.set(t.date, entry)
      }
      if (t.type === 'income') entry.income += t.amount
      else if (t.type === 'expense') entry.expense += t.amount
      entry.items.push(t)
    }
    return map
  }, [transactions])

  const cells = useMemo(() => {
    const year = month.getFullYear()
    const m = month.getMonth()
    const firstDay = new Date(year, m, 1)
    const firstWeekday = firstDay.getDay()
    const daysInMonth = new Date(year, m + 1, 0).getDate()
    const arr: Array<{ day: number; date: Date | null; key: string }> = []
    for (let i = 0; i < firstWeekday; i++) {
      arr.push({ day: 0, date: null, key: `pad-${i}` })
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, m, d)
      arr.push({ day: d, date, key: toISODate(date) })
    }
    return arr
  }, [month])

  const todayStr = toISODate(new Date())
  const monthLabel = `${month.getFullYear()}年${month.getMonth() + 1}月`
  const isCurrentMonth = (function () {
    const now = new Date()
    return month.getFullYear() === now.getFullYear() && month.getMonth() === now.getMonth()
  })()

  const step = (delta: number) => {
    onMonthChange(new Date(month.getFullYear(), month.getMonth() + delta, 1))
  }

  const handleDayClick = (date: Date) => {
    const key = toISODate(date)
    setSelected(key)
    const entry = byDay.get(key)
    onSelectDay(date, entry?.items ?? [])
  }

  return (
    <div className="card calendar-view">
      <div className="cal-header">
        <button className="cal-nav" onClick={() => step(-1)} aria-label="上一月">‹</button>
        <span className="cal-title">{monthLabel}</span>
        <button
          className="cal-nav"
          onClick={() => step(1)}
          disabled={isCurrentMonth}
          aria-label="下一月"
        >›</button>
      </div>

      <div className="cal-weekdays">
        {WEEKDAYS.map(w => (
          <div key={w} className="cal-weekday">{w}</div>
        ))}
      </div>

      <div className="cal-grid">
        {cells.map(cell => {
          if (!cell.date) {
            return <div key={cell.key} className="cal-cell empty" />
          }
          const key = toISODate(cell.date)
          const entry = byDay.get(key)
          const isToday = key === todayStr
          const isSelected = key === selected
          return (
            <button
              key={cell.key}
              className={`cal-cell ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''} ${entry ? 'has-data' : ''}`}
              onClick={() => handleDayClick(cell.date!)}
            >
              <span className="cal-day">{cell.day}</span>
              {entry && (
                <span className="cal-amounts">
                  {entry.income > 0 && (
                    <span className="cal-income">+{formatCompact(entry.income)}</span>
                  )}
                  {entry.expense > 0 && (
                    <span className="cal-expense">-{formatCompact(entry.expense)}</span>
                  )}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

interface DaySheetProps {
  date: Date
  transactions: Transaction[]
  onClose: () => void
}

export function DailyTransactionSheet({ date, transactions, onClose }: DaySheetProps) {
  const navigate = useNavigate()
  const sorted = useMemo(
    () => [...transactions].sort((a, b) =>
      (b.time ?? '').localeCompare(a.time ?? '') || b.createdAt.localeCompare(a.createdAt)
    ),
    [transactions]
  )
  const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const expense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const label = `${date.getMonth() + 1}月${date.getDate()}日`

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog-sheet" onClick={e => e.stopPropagation()}>
        <div className="dialog-header">
          <button className="dialog-btn" onClick={onClose}>关闭</button>
          <span className="dialog-title">{label} 流水</span>
          <span className="dialog-btn" style={{ visibility: 'hidden' }}>关闭</span>
        </div>
        <div className="dialog-body">
          <div className="day-sheet-summary">
            <div className="day-summary-cell">
              <span className="day-summary-label">收入</span>
              <span className="day-summary-value income">+{formatCompact(income)}</span>
            </div>
            <div className="day-summary-cell">
              <span className="day-summary-label">支出</span>
              <span className="day-summary-value expense">-{formatCompact(expense)}</span>
            </div>
            <div className="day-summary-cell">
              <span className="day-summary-label">笔数</span>
              <span className="day-summary-value">{transactions.length}</span>
            </div>
          </div>
          {sorted.length === 0 ? (
            <div className="placeholder">该日无交易</div>
          ) : (
            <div className="day-sheet-list">
              {sorted.map(t => (
                <div
                  key={t.id}
                  className="day-sheet-row"
                  onClick={() => {
                    onClose()
                    navigate(`/transactions/${t.id}`)
                  }}
                >
                  <TransactionRow transaction={t} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function parseDate(s: string): Date {
  return parseISODate(s)
}
