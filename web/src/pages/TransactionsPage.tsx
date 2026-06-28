import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Transaction, TransactionType } from '../db/models'
import { filterByPeriod, parseISODate } from '../utils/date'
import type { StatPeriod } from '../utils/date'
import { asCurrency } from '../utils/format'
import { useQuery } from '../hooks/useQuery'
import { transactionsApi } from '../api/finflow'
import PeriodPicker from '../components/PeriodPicker'
import TransactionRow from '../components/TransactionRow'
import EmptyState from '../components/EmptyState'
import CalendarView, { DailyTransactionSheet } from '../components/CalendarView'
import TransactionFilterSheet, {
  emptyCriteria,
  activeCount,
  type FilterCriteria
} from '../components/TransactionFilterSheet'
import './TransactionsPage.css'

type TypeFilter = 'all' | TransactionType
type ViewMode = 'list' | 'calendar'

interface DayGroup {
  date: string
  transactions: Transaction[]
  income: number
  expense: number
}

const TYPE_FILTERS: Array<{ key: TypeFilter; label: string }> = [
  { key: 'all', label: '全部' },
  { key: 'expense', label: '支出' },
  { key: 'income', label: '收入' }
]

export default function TransactionsPage() {
  const navigate = useNavigate()
  const [period, setPeriod] = useState<StatPeriod>('month')
  const [date, setDate] = useState<Date>(new Date())
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [keyword, setKeyword] = useState('')
  const [criteria, setCriteria] = useState<FilterCriteria>(emptyCriteria())
  const [showFilter, setShowFilter] = useState(false)
  const [daySheet, setDaySheet] = useState<{ date: Date; items: Transaction[] } | null>(null)

  const { data: allTransactions = [], reload } = useQuery(() => transactionsApi.list(), [])

  const periodTx = useMemo(
    () => filterByPeriod(allTransactions, period, date),
    [allTransactions, period, date]
  )

  const filtered = useMemo(() => {
    const min = parseFloat(criteria.minAmount) || 0
    const max = parseFloat(criteria.maxAmount) || Infinity
    const noteKw = criteria.noteContains.trim().toLowerCase()
    return periodTx.filter(t => {
      if (typeFilter !== 'all' && t.type !== typeFilter) return false
      if (criteria.useType && t.type !== criteria.type) return false
      if (criteria.categoryIds.length > 0 && !criteria.categoryIds.includes(t.categoryId ?? '')) return false
      if (criteria.accountIds.length > 0) {
        const involved = [t.accountId, t.toAccountId].filter(Boolean) as string[]
        if (!involved.some(id => criteria.accountIds.includes(id))) return false
      }
      if (criteria.useDateRange) {
        if (criteria.startDate && t.date < criteria.startDate) return false
        if (criteria.endDate && t.date > criteria.endDate) return false
      }
      if (criteria.useAmountRange) {
        if (t.amount < min || t.amount > max) return false
      }
      if (noteKw) {
        const note = t.note.toLowerCase()
        const vendor = (t.vendor ?? '').toLowerCase()
        if (!note.includes(noteKw) && !vendor.includes(noteKw)) return false
      }
      if (keyword.trim()) {
        const k = keyword.trim().toLowerCase()
        const note = t.note.toLowerCase()
        const vendor = (t.vendor ?? '').toLowerCase()
        if (!note.includes(k) && !vendor.includes(k)) return false
      }
      return true
    })
  }, [periodTx, typeFilter, criteria, keyword])

  const groups = useMemo(() => {
    const map = new Map<string, DayGroup>()
    for (const t of filtered) {
      let g = map.get(t.date)
      if (!g) {
        g = { date: t.date, transactions: [], income: 0, expense: 0 }
        map.set(t.date, g)
      }
      g.transactions.push(t)
      if (t.type === 'income') g.income += t.amount
      else if (t.type === 'expense') g.expense += t.amount
    }
    const list = Array.from(map.values())
    list.sort((a, b) => b.date.localeCompare(a.date))
    for (const g of list) {
      g.transactions.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    }
    return list
  }, [filtered])

  const totals = useMemo(() => {
    let income = 0
    let expense = 0
    for (const t of filtered) {
      if (t.type === 'income') income += t.amount
      else if (t.type === 'expense') expense += t.amount
    }
    return { income, expense, balance: income - expense, count: filtered.length }
  }, [filtered])

  const hasFilters = typeFilter !== 'all' || keyword.trim() || activeCount(criteria) > 0

  const handleClearFilters = () => {
    setTypeFilter('all')
    setKeyword('')
    setCriteria(emptyCriteria())
  }

  return (
    <div className="page tx-page">
      <header className="page-header">
        <h1>账单</h1>
        <div className="header-right-cluster">
          <div className="view-mode-seg">
            <button
              className={`seg-mini ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              aria-label="列表视图"
            >☰</button>
            <button
              className={`seg-mini ${viewMode === 'calendar' ? 'active' : ''}`}
              onClick={() => setViewMode('calendar')}
              aria-label="日历视图"
            >📅</button>
          </div>
          <button
            className={`header-icon filter-trigger ${activeCount(criteria) > 0 ? 'has-badge' : ''}`}
            onClick={() => setShowFilter(true)}
            aria-label="筛选"
          >
            ⚙
            {activeCount(criteria) > 0 && (
              <span className="filter-badge">{activeCount(criteria)}</span>
            )}
          </button>
          <button className="header-icon" onClick={() => navigate('/search')} aria-label="搜索">🔍</button>
        </div>
      </header>

      <PeriodPicker
        period={period}
        date={date}
        onPeriodChange={setPeriod}
        onDateChange={setDate}
      />

      <div className="card filter-card">
        <div className="type-chips">
          {TYPE_FILTERS.map(f => (
            <button
              key={f.key}
              className={`chip ${typeFilter === f.key ? 'active' : ''}`}
              onClick={() => setTypeFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>

        <input
          className="filter-search"
          type="search"
          placeholder="搜索备注或商家"
          value={keyword}
          onChange={e => setKeyword(e.target.value)}
        />

        {hasFilters && (
          <button className="filter-clear" onClick={handleClearFilters}>
            清除全部筛选
          </button>
        )}
      </div>

      {showFilter && (
        <TransactionFilterSheet
          criteria={criteria}
          onApply={setCriteria}
          onClose={() => setShowFilter(false)}
        />
      )}

      {viewMode === 'calendar' ? (
        <>
          {filtered.length === 0 ? (
            <div className="card">
              <EmptyState
                icon="📅"
                title={hasFilters ? '没有匹配的交易' : '本期暂无交易'}
                subtitle={hasFilters ? '试试清除筛选条件' : '点击右下角 + 记一笔'}
                height={200}
              />
            </div>
          ) : (
            <CalendarView
              transactions={filtered}
              month={period === 'month' ? date : new Date()}
              onMonthChange={(m) => {
                setPeriod('month')
                setDate(m)
              }}
              onSelectDay={(d, items) => setDaySheet({ date: d, items })}
            />
          )}
        </>
      ) : (
        <div className={`tx-list ${groups.length === 0 ? 'empty' : ''}`}>
          {groups.length === 0 ? (
            <div className="card">
              <EmptyState
                icon="📋"
                title={hasFilters ? '没有匹配的交易' : '本期暂无交易'}
                subtitle={hasFilters ? '试试清除筛选条件' : '点击右下角 + 记一笔'}
                height={200}
              />
            </div>
          ) : (
            groups.map(g => (
              <section key={g.date} className="day-group">
                <div className="day-header">
                  <span className="day-date">{formatDayHeader(g.date)}</span>
                  <span className="day-net">
                    {g.income > 0 && (
                      <span className="day-income">+{asCurrency(g.income)}</span>
                    )}
                    {g.expense > 0 && (
                      <span className="day-expense">-{asCurrency(g.expense)}</span>
                    )}
                  </span>
                </div>
                <div className="card day-card">
                  {g.transactions.map(t => (
                    <TxRowWithDelete
                      key={t.id}
                      transaction={t}
                      onNavigate={() => navigate(`/transactions/${t.id}`)}
                      onDelete={async () => {
                        if (!confirm('删除此交易？')) return
                        await transactionsApi.remove(t.id)
                        reload()
                      }}
                    />
                  ))}
                </div>
              </section>
            ))
          )}
        </div>
      )}

      <div className="tx-summary-bar">
        <div className="tx-summary-cell">
          <span className="tx-summary-label">收入</span>
          <span className="tx-summary-value income">+{asCurrency(totals.income)}</span>
        </div>
        <div className="tx-summary-cell">
          <span className="tx-summary-label">支出</span>
          <span className="tx-summary-value expense">-{asCurrency(totals.expense)}</span>
        </div>
        <div className="tx-summary-cell">
          <span className="tx-summary-label">结余</span>
          <span className="tx-summary-value balance">{asCurrency(totals.balance)}</span>
        </div>
        <div className="tx-summary-cell">
          <span className="tx-summary-label">笔数</span>
          <span className="tx-summary-value count">{totals.count}</span>
        </div>
      </div>

      {daySheet && (
        <DailyTransactionSheet
          date={daySheet.date}
          transactions={daySheet.items}
          onClose={() => setDaySheet(null)}
        />
      )}
    </div>
  )
}

function formatDayHeader(dateStr: string): string {
  const d = parseISODate(dateStr)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  const isToday = d.toDateString() === today.toDateString()
  const isYesterday = d.toDateString() === yesterday.toDateString()
  const md = `${d.getMonth() + 1}月${d.getDate()}日`
  const weekday = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()]
  if (isToday) return `今天 · ${md}`
  if (isYesterday) return `昨天 · ${md}`
  return `${md} · ${weekday}`
}

interface TxRowWithDeleteProps {
  transaction: Transaction
  onNavigate: () => void
  onDelete: () => void | Promise<void>
}

function TxRowWithDelete({ transaction, onNavigate, onDelete }: TxRowWithDeleteProps) {
  const pressTimer = useRef<number | null>(null)
  const longPressed = useRef(false)

  const startPress = () => {
    longPressed.current = false
    pressTimer.current = window.setTimeout(() => {
      longPressed.current = true
      onDelete()
    }, 600)
  }
  const cancelPress = () => {
    if (pressTimer.current) {
      window.clearTimeout(pressTimer.current)
      pressTimer.current = null
    }
  }

  return (
    <div
      className="tx-row-wrap"
      onClick={() => {
        if (longPressed.current) {
          longPressed.current = false
          return
        }
        onNavigate()
      }}
      onTouchStart={startPress}
      onTouchEnd={cancelPress}
      onTouchMove={cancelPress}
    >
      <TransactionRow transaction={transaction} />
      <button
        className="tx-row-delete"
        onClick={(e) => {
          e.stopPropagation()
          onDelete()
        }}
        aria-label="删除"
      >
        ×
      </button>
    </div>
  )
}
