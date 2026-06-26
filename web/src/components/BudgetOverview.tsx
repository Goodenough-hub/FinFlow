import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import type { Budget, Category, Transaction } from '../db/models'
import { collectDescendantIds } from '../utils/category'
import { asCurrency } from '../utils/format'
import CategoryIcon from './CategoryIcon'
import './BudgetOverview.css'

export default function BudgetOverview() {
  const navigate = useNavigate()
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  const allBudgets = useLiveQuery(() => db.budgets.toArray(), [], [] as Budget[])
  const allCategories = useLiveQuery(() => db.categories.toArray(), [], [] as Category[])
  const allTransactions = useLiveQuery(() => db.transactions.toArray(), [], [] as Transaction[])

  const rows = useMemo(() => {
    const monthBudgets = allBudgets.filter(b => b.year === year && b.month === month)
    const monthStr = `${year}-${String(month).padStart(2, '0')}-`

    return monthBudgets
      .map(b => {
        const cat = allCategories.find(c => c.id === b.categoryId)
        if (!cat) return null
        const ids = collectDescendantIds(cat.id, allCategories)
        ids.add(cat.id)
        let spent = 0
        for (const t of allTransactions) {
          if (t.type !== 'expense' || !t.categoryId) continue
          if (!t.date.startsWith(monthStr)) continue
          if (ids.has(t.categoryId)) spent += t.amount
        }
        return { budget: b, category: cat, spent }
      })
      .filter((r): r is NonNullable<typeof r> => r !== null)
      .sort((a, b) => (b.spent / b.budget.amount) - (a.spent / a.budget.amount))
  }, [allBudgets, allCategories, allTransactions, year, month])

  const totals = useMemo(() => {
    const totalBudget = rows.reduce((s, r) => s + r.budget.amount, 0)
    const totalSpent = rows.reduce((s, r) => s + r.spent, 0)
    return { totalBudget, totalSpent }
  }, [rows])

  if (rows.length === 0) return null

  const overallRatio = totals.totalBudget > 0 ? totals.totalSpent / totals.totalBudget : 0
  const overallPercent = Math.round(overallRatio * 100)

  return (
    <section className="budget-overview">
      <div className="section-header">
        <span className="section-title">本月预算</span>
        <button className="section-link" onClick={() => navigate('/budgets')}>
          查看全部 ›
        </button>
      </div>

      <div className="card budget-overview-card">
        <div className="bo-total-row">
          <div className="bo-total-info">
            <span className="bo-total-label">总进度</span>
            <span className="bo-total-amounts">
              <span className="bo-spent">{asCurrency(totals.totalSpent)}</span>
              <span className="bo-separator"> / </span>
              <span className="bo-budget">{asCurrency(totals.totalBudget)}</span>
            </span>
          </div>
          <span
            className="bo-total-percent"
            style={{ color: overallRatio > 1 ? 'var(--overspend-red)' : overallRatio >= 0.8 ? 'var(--expense-gold)' : 'var(--accent-blue)' }}
          >
            {overallPercent}%
          </span>
        </div>
        <div className="bo-total-bar">
          <div
            className="bo-total-fill"
            style={{
              width: `${Math.min(100, overallRatio * 100)}%`,
              background: overallRatio > 1 ? 'var(--overspend-red)' : overallRatio >= 0.8 ? 'var(--expense-gold)' : 'var(--accent-blue)'
            }}
          />
        </div>

        <div className="bo-rows">
          {rows.slice(0, 4).map(({ budget, category, spent }) => {
            const ratio = budget.amount > 0 ? spent / budget.amount : 0
            const percent = Math.round(ratio * 100)
            const overspent = spent > budget.amount
            const near = !overspent && ratio >= 0.8
            const color = overspent ? 'var(--overspend-red)' : near ? 'var(--expense-gold)' : 'var(--accent-blue)'
            return (
              <div key={budget.id} className="bo-row">
                <CategoryIcon icon={category.icon} color={category.colorHex} size={28} />
                <div className="bo-row-info">
                  <div className="bo-row-top">
                    <span className="bo-row-name">{category.name}</span>
                    <span className="bo-row-amount" style={{ color }}>
                      {asCurrency(spent)} / {asCurrency(budget.amount)}
                    </span>
                  </div>
                  <div className="bo-row-bar">
                    <div
                      className="bo-row-fill"
                      style={{ width: `${Math.min(100, ratio * 100)}%`, background: color }}
                    />
                  </div>
                </div>
                <span className="bo-row-percent" style={{ color }}>
                  {percent}%
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
