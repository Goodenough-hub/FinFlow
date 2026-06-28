import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Budget, Category } from '../db/models'
import { collectDescendantIds } from '../utils/category'
import { asCurrency } from '../utils/format'
import { monthYearString } from '../utils/date'
import { useQuery } from '../hooks/useQuery'
import { useCategories } from '../hooks/useLookup'
import { budgetsApi, transactionsApi } from '../api/finflow'
import CategoryIcon from '../components/CategoryIcon'
import './BudgetsPage.css'

type DialogState =
  | { mode: 'closed' }
  | { mode: 'new' }
  | { mode: 'edit'; budget: Budget }

export default function BudgetsPage() {
  const navigate = useNavigate()
  const [ref, setRef] = useState<Date>(new Date())
  const [dialog, setDialog] = useState<DialogState>({ mode: 'closed' })

  const year = ref.getFullYear()
  const month = ref.getMonth() + 1

  const { data: allBudgets = [], reload: reloadBudgets } = useQuery(
    () => budgetsApi.list(year, month),
    [year, month]
  )
  const { list: allCategories = [] } = useCategories()
  const { data: allTransactions = [] } = useQuery(() => transactionsApi.list(), [])

  const monthBudgets = allBudgets

  const rows = useMemo(() => {
    return monthBudgets
      .map(b => {
        const cat = allCategories.find(c => c.id === b.categoryId)
        if (!cat) return null
        const ids = collectDescendantIds(cat.id, allCategories)
        ids.add(cat.id)
        let spent = 0
        for (const t of allTransactions) {
          if (t.type !== 'expense' || !t.categoryId) continue
          if (ids.has(t.categoryId)) spent += t.amount
        }
        return { budget: b, category: cat, spent }
      })
      .filter((r): r is NonNullable<typeof r> => r !== null)
      .sort((a, b) => b.spent - b.budget.amount - (a.spent - a.budget.amount))
  }, [monthBudgets, allCategories, allTransactions])

  const totals = useMemo(() => {
    const totalBudget = rows.reduce((s, r) => s + r.budget.amount, 0)
    const totalSpent = rows.reduce((s, r) => s + r.spent, 0)
    return { totalBudget, totalSpent, remaining: totalBudget - totalSpent }
  }, [rows])

  const stepMonth = (delta: number) => {
    const d = new Date(ref)
    d.setMonth(d.getMonth() + delta)
    setRef(d)
  }

  const isCurrentMonth = () => {
    const now = new Date()
    return now.getFullYear() === year && now.getMonth() + 1 === month
  }

  const canAddNew = useMemo(() => {
    const usedIds = new Set(monthBudgets.map(b => b.categoryId))
    return allCategories.filter(c => c.type === 'expense' && !usedIds.has(c.id)).length > 0
  }, [allCategories, monthBudgets])

  return (
    <div className="page budgets-page">
      <header className="form-header">
        <button className="form-header-btn" onClick={() => navigate(-1)}>返回</button>
        <span className="form-title">预算管理</span>
        <button
          className="form-header-btn primary"
          onClick={() => setDialog({ mode: 'new' })}
          disabled={!canAddNew}
        >
          + 新建
        </button>
      </header>

      <div className="month-picker">
        <button className="month-arrow" onClick={() => stepMonth(-1)} aria-label="上一月">‹</button>
        <span className="month-title">{monthYearString(ref)}</span>
        <button
          className="month-arrow"
          onClick={() => stepMonth(1)}
          disabled={isCurrentMonth()}
          aria-label="下一月"
        >
          ›
        </button>
      </div>

      <div className="card budget-summary">
        <div className="summary-row">
          <span className="summary-label">总预算</span>
          <span className="summary-value">{asCurrency(totals.totalBudget)}</span>
        </div>
        <div className="summary-row">
          <span className="summary-label">已支出</span>
          <span className="summary-value spent">{asCurrency(totals.totalSpent)}</span>
        </div>
        <div className="summary-row">
          <span className="summary-label">剩余</span>
          <span
            className="summary-value"
            style={{ color: totals.remaining >= 0 ? 'var(--income-green)' : 'var(--overspend-red)' }}
          >
            {asCurrency(totals.remaining)}
          </span>
        </div>
        {totals.totalBudget > 0 && (
          <div className="overall-progress">
            <div
              className="overall-progress-fill"
              style={{
                width: `${Math.min(100, (totals.totalSpent / totals.totalBudget) * 100)}%`,
                background: totals.totalSpent > totals.totalBudget ? 'var(--overspend-red)' : 'var(--accent-blue)'
              }}
            />
          </div>
        )}
      </div>

      <div className="budget-list">
        {rows.length === 0 ? (
          <div className="card budget-empty">
            <div className="empty-icon">🎯</div>
            <div className="empty-title">本月暂无预算</div>
            <div className="empty-hint">点击右上角 + 为分类设置预算</div>
          </div>
        ) : (
          rows.map(({ budget, category, spent }) => (
            <BudgetRow
              key={budget.id}
              budget={budget}
              category={category}
              spent={spent}
              onClick={() => setDialog({ mode: 'edit', budget })}
            />
          ))
        )}
      </div>

      {dialog.mode !== 'closed' && (
        <BudgetDialog
          state={dialog}
          year={year}
          month={month}
          excludeIds={monthBudgets.map(b => b.categoryId)}
          onClose={() => setDialog({ mode: 'closed' })}
          onSaved={reloadBudgets}
        />
      )}
    </div>
  )
}

interface BudgetRowProps {
  budget: Budget
  category: Category
  spent: number
  onClick: () => void
}

function BudgetRow({ budget, category, spent, onClick }: BudgetRowProps) {
  const ratio = budget.amount > 0 ? spent / budget.amount : 0
  const percent = Math.min(100, ratio * 100)
  const overspent = spent > budget.amount
  const near = !overspent && ratio >= 0.8
  const color = overspent ? 'var(--overspend-red)' : near ? 'var(--expense-gold)' : 'var(--accent-blue)'

  return (
    <div className="card budget-row" onClick={onClick}>
      <div className="budget-row-top">
        <CategoryIcon icon={category.icon} color={category.colorHex} size={36} />
        <div className="budget-row-info">
          <div className="budget-row-name">{category.name}</div>
          <div className="budget-row-amounts">
            <span className="spent" style={{ color }}>{asCurrency(spent)}</span>
            <span className="separator"> / </span>
            <span className="budget">{asCurrency(budget.amount)}</span>
          </div>
        </div>
        <div className="budget-row-percent" style={{ color }}>
          {Math.round(ratio * 100)}%
        </div>
      </div>
      <div className="budget-progress">
        <div
          className="budget-progress-fill"
          style={{ width: `${percent}%`, background: color }}
        />
      </div>
      {overspent && (
        <div className="budget-overspent">
          超支 {asCurrency(spent - budget.amount)}
        </div>
      )}
    </div>
  )
}

interface DialogProps {
  state: Exclude<DialogState, { mode: 'closed' }>
  year: number
  month: number
  excludeIds: string[]
  onClose: () => void
  onSaved: () => void
}

function BudgetDialog({ state, year, month, excludeIds, onClose, onSaved }: DialogProps) {
  const isEdit = state.mode === 'edit'
  const existing = isEdit ? state.budget : undefined

  const { list: availableCategories = [] } = useCategories()

  const [categoryId, setCategoryId] = useState<string>(existing?.categoryId ?? '')
  const [amountText, setAmountText] = useState(existing ? String(existing.amount) : '')

  const options = useMemo(() => {
    return availableCategories
      .filter(c => c.type === 'expense')
      .filter(c => !excludeIds.includes(c.id) || c.id === existing?.categoryId)
      .sort((a, b) => a.sortOrder - b.sortOrder)
  }, [availableCategories, excludeIds, existing])

  const amount = parseFloat(amountText) || 0
  const canSave = (isEdit || categoryId) && amount > 0

  const handleSave = async () => {
    if (!canSave) return
    if (existing) {
      await budgetsApi.upsert({ ...existing, amount })
    } else {
      await budgetsApi.upsert({
        id: '',
        amount,
        month,
        year,
        categoryId
      })
    }
    onSaved()
    onClose()
  }

  const handleDelete = async () => {
    if (!existing) return
    if (!confirm('删除此预算？')) return
    await budgetsApi.remove(existing.id)
    onSaved()
    onClose()
  }

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog-sheet" onClick={e => e.stopPropagation()}>
        <div className="dialog-header">
          <button className="dialog-btn" onClick={onClose}>取消</button>
          <span className="dialog-title">{isEdit ? '编辑预算' : '新建预算'}</span>
          <button
            className="dialog-btn primary"
            onClick={handleSave}
            disabled={!canSave}
          >
            保存
          </button>
        </div>

        <div className="dialog-body">
          <div className="dialog-field">
            <label>分类</label>
            {isEdit ? (
              <div className="readonly-category">
                {(() => {
                  const c = availableCategories.find(c => c.id === existing?.categoryId)
                  return c ? (
                    <>
                      <CategoryIcon icon={c.icon} color={c.colorHex} size={32} />
                      <span>{c.name}</span>
                    </>
                  ) : <span>已删除</span>
                })()}
              </div>
            ) : (
              <select
                className="filter-select"
                value={categoryId}
                onChange={e => setCategoryId(e.target.value)}
              >
                <option value="">选择分类</option>
                {options.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            )}
          </div>

          <div className="dialog-field">
            <label>预算金额</label>
            <div className="amount-input-wrap">
              <span className="amount-currency">¥</span>
              <input
                className="amount-input"
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={amountText}
                onChange={e => setAmountText(e.target.value)}
                autoFocus={!isEdit}
              />
            </div>
          </div>

          {isEdit && (
            <button className="delete-btn" onClick={handleDelete}>删除此预算</button>
          )}
        </div>
      </div>
    </div>
  )
}
