import { useMemo } from 'react'
import { collectDescendantIds } from '../utils/category'
import { asCurrency } from '../utils/format'
import { useQuery } from '../hooks/useQuery'
import { useCategories } from '../hooks/useLookup'
import { budgetsApi, transactionsApi } from '../api/finflow'
import './OverspendAlertBanner.css'

interface Alert {
  categoryId: string
  categoryName: string
  spent: number
  budget: number
}

export default function OverspendAlertBanner() {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  const { data: allBudgets = [] } = useQuery(() => budgetsApi.list(year, month), [year, month])
  const { list: allCategories = [] } = useCategories()
  const { data: allTransactions = [] } = useQuery(() => transactionsApi.list(), [])

  const alerts = useMemo<Alert[]>(() => {
    const monthBudgets = allBudgets.filter(b => b.year === year && b.month === month)
    const monthPrefix = `${year}-${String(month).padStart(2, '0')}-`

    const result: Alert[] = []
    for (const b of monthBudgets) {
      const cat = allCategories.find(c => c.id === b.categoryId)
      if (!cat) continue
      const ids = collectDescendantIds(cat.id, allCategories)
      ids.add(cat.id)
      let spent = 0
      for (const t of allTransactions) {
        if (t.type !== 'expense' || !t.categoryId) continue
        if (!t.date.startsWith(monthPrefix)) continue
        if (ids.has(t.categoryId)) spent += t.amount
      }
      if (spent > b.amount) {
        result.push({
          categoryId: cat.id,
          categoryName: cat.name,
          spent,
          budget: b.amount
        })
      }
    }
    return result.sort((a, b) => (b.spent - b.budget) - (a.spent - a.budget))
  }, [allBudgets, allCategories, allTransactions, year, month])

  if (alerts.length === 0) return null

  return (
    <div className="overspend-banner">
      <div className="overspend-bar" />
      <div className="overspend-body">
        <div className="overspend-head">
          <span className="overspend-icon">⚠</span>
          <span className="overspend-title">超支预警</span>
          <span className="overspend-count">{alerts.length} 项</span>
        </div>
        <div className="overspend-list">
          {alerts.slice(0, 3).map(a => (
            <div key={a.categoryId} className="overspend-row">
              <span className="overspend-name">{a.categoryName}</span>
              <span className="overspend-amount">
                {asCurrency(a.spent)} / {asCurrency(a.budget)}
              </span>
            </div>
          ))}
        </div>
        {alerts.length > 3 && (
          <div className="overspend-more">还有 {alerts.length - 3} 项…</div>
        )}
      </div>
    </div>
  )
}
