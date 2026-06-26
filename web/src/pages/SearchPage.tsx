import { useMemo, useState, useEffect, useRef } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router-dom'
import { db } from '../db/db'
import type { Account, Category, Transaction } from '../db/models'
import { asCurrency } from '../utils/format'
import { parseISODate } from '../utils/date'
import TransactionRow from '../components/TransactionRow'
import EmptyState from '../components/EmptyState'
import './SearchPage.css'

const RECENT_KEY = 'finflow.web.recent-searches'
const MAX_RECENT = 8

export default function SearchPage() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const [recent, setRecent] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]')
    } catch {
      return []
    }
  })

  const allTransactions = useLiveQuery(() => db.transactions.toArray(), [], [] as Transaction[])
  const allCategories = useLiveQuery(() => db.categories.toArray(), [], [] as Category[])
  const allAccounts = useLiveQuery(() => db.accounts.toArray(), [], [] as Account[])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 200)
    return () => clearTimeout(t)
  }, [query])

  const results = useMemo(() => {
    if (!debounced) return []
    const k = debounced.toLowerCase()
    const catMap = new Map(allCategories.map(c => [c.id, c]))
    const accMap = new Map(allAccounts.map(a => [a.id, a]))

    return allTransactions
      .filter(t => {
        const note = t.note.toLowerCase()
        const vendor = (t.vendor ?? '').toLowerCase()
        if (note.includes(k) || vendor.includes(k)) return true
        const cat = t.categoryId ? catMap.get(t.categoryId) : undefined
        if (cat?.name.toLowerCase().includes(k)) return true
        const amt = String(t.amount)
        if (amt.includes(k)) return true
        return false
      })
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
      .map(t => ({ tx: t, cat: t.categoryId ? catMap.get(t.categoryId) : undefined, acc: t.accountId ? accMap.get(t.accountId) : undefined }))
  }, [debounced, allTransactions, allCategories, allAccounts])

  const grouped = useMemo(() => {
    const map = new Map<string, typeof results>()
    for (const r of results) {
      const list = map.get(r.tx.date) ?? []
      list.push(r)
      map.set(r.tx.date, list)
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]))
  }, [results])

  const totals = useMemo(() => {
    let income = 0
    let expense = 0
    for (const r of results) {
      if (r.tx.type === 'income') income += r.tx.amount
      else if (r.tx.type === 'expense') expense += r.tx.amount
    }
    return { income, expense, count: results.length }
  }, [results])

  const saveRecent = (q: string) => {
    if (!q.trim()) return
    const next = [q, ...recent.filter(r => r !== q)].slice(0, MAX_RECENT)
    setRecent(next)
    localStorage.setItem(RECENT_KEY, JSON.stringify(next))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    saveRecent(query.trim())
  }

  const handleClearRecent = () => {
    setRecent([])
    localStorage.removeItem(RECENT_KEY)
  }

  return (
    <div className="search-page">
      <header className="search-header">
        <button className="search-back" onClick={() => navigate(-1)} aria-label="返回">‹</button>
        <form className="search-form" onSubmit={handleSubmit}>
          <span className="search-icon">🔍</span>
          <input
            ref={inputRef}
            className="search-input"
            type="search"
            placeholder="搜索备注、商家、分类、金额"
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoComplete="off"
          />
          {query && (
            <button
              type="button"
              className="search-clear"
              onClick={() => setQuery('')}
              aria-label="清空"
            >
              ✕
            </button>
          )}
        </form>
      </header>

      {!debounced ? (
        <div className="search-body">
          {recent.length > 0 && (
            <section className="recent-section">
              <div className="recent-header">
                <span className="recent-title">最近搜索</span>
                <button className="recent-clear" onClick={handleClearRecent}>清空</button>
              </div>
              <div className="recent-chips">
                {recent.map(r => (
                  <button
                    key={r}
                    className="recent-chip"
                    onClick={() => setQuery(r)}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </section>
          )}
          {recent.length === 0 && (
            <div className="card">
              <EmptyState
                icon="🔍"
                title="搜索全部交易"
                subtitle="输入关键词查找备注、商家、分类或金额"
                height={220}
              />
            </div>
          )}
        </div>
      ) : results.length === 0 ? (
        <div className="search-body">
          <div className="card">
            <EmptyState
              icon="🤔"
              title={`没有匹配「${debounced}」的交易`}
              subtitle="试试其他关键词"
              height={220}
            />
          </div>
        </div>
      ) : (
        <div className="search-body">
          <div className="search-stats">
            共 {totals.count} 笔 ·
            <span className="stat-income"> 收入 {asCurrency(totals.income)}</span> ·
            <span className="stat-expense"> 支出 {asCurrency(totals.expense)}</span>
          </div>

          {grouped.map(([date, items]) => (
            <section key={date} className="result-group">
              <div className="result-date">{formatDateHeader(date)}</div>
              <div className="card result-card">
                {items.map(({ tx, cat }) => (
                  <div
                    key={tx.id}
                    className="tx-row-wrap"
                    onClick={() => navigate(`/transactions/${tx.id}`)}
                  >
                    <TransactionRow transaction={tx} />
                    {cat && (
                      <div className="result-tag" style={{ color: cat.colorHex }}>
                        #{cat.name}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

function formatDateHeader(dateStr: string): string {
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
