import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Account, Category, RecurringTransaction, TransactionType } from '../db/models'
import { asCurrency } from '../utils/format'
import { toISODate, parseISODate } from '../utils/date'
import { getLeafAccounts } from '../utils/account'
import { computeNextDate } from '../services/recurring'
import { useQuery } from '../hooks/useQuery'
import { useCategories, useAccounts } from '../hooks/useLookup'
import { recurringApi } from '../api/finflow'
import CategoryIcon from '../components/CategoryIcon'
import './RecurringPage.css'

type DialogState =
  | { mode: 'closed' }
  | { mode: 'new' }
  | { mode: 'edit'; recurring: RecurringTransaction }

const FREQUENCY_LABEL: Record<RecurringTransaction['frequency'], string> = {
  daily: '每天',
  weekly: '每周',
  monthly: '每月',
  yearly: '每年'
}

const WEEKDAY_LABELS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
const WEEKDAY_VALUES: Array<{ value: number; label: string }> = [
  { value: 1, label: '日' },
  { value: 2, label: '一' },
  { value: 3, label: '二' },
  { value: 4, label: '三' },
  { value: 5, label: '四' },
  { value: 6, label: '五' },
  { value: 7, label: '六' }
]

export default function RecurringPage() {
  const navigate = useNavigate()
  const [dialog, setDialog] = useState<DialogState>({ mode: 'closed' })

  const { data: allRecurring = [], reload: reloadRecurring } = useQuery(() => recurringApi.list(), [])
  const { list: allCategories = [] } = useCategories()
  const { list: allAccounts = [] } = useAccounts()

  const sorted = useMemo(
    () => allRecurring.slice().sort((a, b) => a.nextDate.localeCompare(b.nextDate)),
    [allRecurring]
  )

  const handleProcessNow = async () => {
    try {
      const result: any = await recurringApi.process()
      const count = typeof result === 'number' ? result : (result?.processed ?? 0)
      alert(count > 0 ? `已生成 ${count} 笔交易` : '当前无需生成')
      reloadRecurring()
    } catch (e) {
      alert(`生成失败：${(e as Error).message}`)
    }
  }

  return (
    <div className="page recurring-page">
      <header className="form-header">
        <button className="form-header-btn" onClick={() => navigate(-1)}>返回</button>
        <span className="form-title">周期性交易</span>
        <button className="form-header-btn" onClick={handleProcessNow}>
          立即生成
        </button>
      </header>

      <div className="recurring-hint card">
        <span className="hint-icon">💡</span>
        <span>系统会在每次启动时自动按周期生成交易，到期日即记录日期。</span>
      </div>

      <div className="recurring-list">
        {sorted.length === 0 ? (
          <div className="card recurring-empty">
            <div className="empty-icon">🔁</div>
            <div className="empty-title">暂无周期性交易</div>
            <div className="empty-hint">点击右上角 + 创建模板，例如月租、订阅</div>
          </div>
        ) : (
          sorted.map(r => (
            <RecurringRow
              key={r.id}
              recurring={r}
              category={allCategories.find(c => c.id === r.categoryId)}
              account={allAccounts.find(a => a.id === r.accountId)}
              onClick={() => setDialog({ mode: 'edit', recurring: r })}
              onToggle={async () => {
                const next = r.isActive === false
                await recurringApi.update(r.id, { isActive: next })
                reloadRecurring()
              }}
            />
          ))
        )}
      </div>

      <button
        className="recurring-fab"
        onClick={() => setDialog({ mode: 'new' })}
        aria-label="新建周期性交易"
      >
        +
      </button>

      {dialog.mode !== 'closed' && (
        <RecurringDialog
          state={dialog}
          onClose={() => setDialog({ mode: 'closed' })}
          onSaved={reloadRecurring}
        />
      )}
    </div>
  )
}

interface RowProps {
  recurring: RecurringTransaction
  category?: Category
  account?: Account
  onClick: () => void
  onToggle: () => void
}

function RecurringRow({ recurring: r, category, account, onClick, onToggle }: RowProps) {
  const isIncome = r.type === 'income'
  const sign = isIncome ? '+' : '-'
  const color = isIncome ? 'var(--income-green)' : 'var(--expense-gold)'
  const title = r.note || category?.name || '未分类'
  const todayStr = toISODate(new Date())
  const isOverdue = r.nextDate < todayStr
  const paused = r.isActive === false

  const freqDetail = useMemo(() => {
    if (r.frequency === 'monthly' && r.dayOfMonth) return `每月 ${r.dayOfMonth} 号`
    if (r.frequency === 'weekly' && r.dayOfWeek) {
      const label = WEEKDAY_LABELS[(r.dayOfWeek - 1) % 7]
      return `每${label}`
    }
    return FREQUENCY_LABEL[r.frequency]
  }, [r.frequency, r.dayOfMonth, r.dayOfWeek])

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    onToggle()
  }

  return (
    <div className={`card recurring-row ${paused ? 'paused' : ''}`} onClick={onClick}>
      <CategoryIcon icon={category?.icon ?? '🔁'} color={category?.colorHex ?? '#6B7280'} size={40} />
      <div className="recurring-info">
        <div className="recurring-title">{title}{paused && <span className="paused-tag">已暂停</span>}</div>
        <div className="recurring-subtitle">
          {freqDetail}
          {r.interval > 1 ? ` × ${r.interval}` : ''}
          {account ? ` · ${account.name}` : ''}
        </div>
        <div className={`recurring-next ${isOverdue ? 'overdue' : ''}`}>
          {paused ? '暂停中' : isOverdue ? '已到期 · ' : '下次 · '}
          {!paused && formatDate(r.nextDate)}
        </div>
      </div>
      <button
        className={`toggle-btn ${paused ? 'off' : 'on'}`}
        onClick={handleToggle}
        aria-label={paused ? '启用' : '暂停'}
      >
        <span className={`toggle-knob ${paused ? 'off' : 'on'}`} />
      </button>
      <div className="recurring-amount" style={{ color: paused ? 'var(--text-tertiary)' : color }}>
        {sign}{asCurrency(r.amount)}
      </div>
    </div>
  )
}

interface DialogProps {
  state: Exclude<DialogState, { mode: 'closed' }>
  onClose: () => void
  onSaved: () => void
}

function RecurringDialog({ state, onClose, onSaved }: DialogProps) {
  const isEdit = state.mode === 'edit'
  const existing = isEdit ? state.recurring : undefined

  const { list: allCategories = [] } = useCategories()
  const { list: allAccounts = [] } = useAccounts()

  const [type, setType] = useState<TransactionType>(existing?.type ?? 'expense')
  const [amountText, setAmountText] = useState(existing ? String(existing.amount) : '')
  const [note, setNote] = useState(existing?.note ?? '')
  const [categoryId, setCategoryId] = useState(existing?.categoryId ?? '')
  const [accountId, setAccountId] = useState(existing?.accountId ?? '')
  const [frequency, setFrequency] = useState<RecurringTransaction['frequency']>(existing?.frequency ?? 'monthly')
  const [interval, setInterval] = useState(String(existing?.interval ?? 1))
  const [dayOfMonth, setDayOfMonth] = useState(String(existing?.dayOfMonth ?? 1))
  const [dayOfWeek, setDayOfWeek] = useState(String(existing?.dayOfWeek ?? 1))
  const [startDate, setStartDate] = useState(existing?.startDate ?? toISODate(new Date()))
  const [endDate, setEndDate] = useState(existing?.endDate ?? '')

  const availableCategories = useMemo(
    () => allCategories
      .filter(c => c.type === (type === 'income' ? 'income' : 'expense'))
      .sort((a, b) => a.sortOrder - b.sortOrder),
    [allCategories, type]
  )

  const availableAccounts = useMemo(
    () => getLeafAccounts(allAccounts).filter(a => a.type !== 'fixed'),
    [allAccounts]
  )

  const amount = parseFloat(amountText) || 0
  const intervalNum = parseInt(interval, 10) || 1
  const dayOfMonthNum = Math.min(Math.max(parseInt(dayOfMonth, 10) || 1, 1), 28)
  const dayOfWeekNum = Math.min(Math.max(parseInt(dayOfWeek, 10) || 1, 1), 7)
  const canSave = amount > 0 && intervalNum > 0 && startDate

  const handleSave = async () => {
    if (!canSave) return
    const rule = {
      frequency,
      interval: intervalNum,
      dayOfMonth: frequency === 'monthly' ? dayOfMonthNum : undefined,
      dayOfWeek: frequency === 'weekly' ? dayOfWeekNum : undefined
    }
    const nextDate = computeNextDate(startDate, rule)
    const payload: Partial<RecurringTransaction> = {
      amount,
      type,
      note,
      categoryId: categoryId || undefined,
      accountId: accountId || undefined,
      frequency,
      interval: intervalNum,
      dayOfMonth: rule.dayOfMonth,
      dayOfWeek: rule.dayOfWeek,
      startDate,
      endDate: endDate || undefined,
      nextDate,
      isActive: existing?.isActive !== false
    }
    if (existing) {
      await recurringApi.update(existing.id, payload)
    } else {
      await recurringApi.create(payload as Omit<RecurringTransaction, 'id' | 'createdAt'>)
    }
    onSaved()
    onClose()
  }

  const handleDelete = async () => {
    if (!existing) return
    if (!confirm('删除此周期性交易模板？已生成的交易不受影响。')) return
    await recurringApi.remove(existing.id)
    onSaved()
    onClose()
  }

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog-sheet" onClick={e => e.stopPropagation()}>
        <div className="dialog-header">
          <button className="dialog-btn" onClick={onClose}>取消</button>
          <span className="dialog-title">{isEdit ? '编辑周期性交易' : '新建周期性交易'}</span>
          <button className="dialog-btn primary" onClick={handleSave} disabled={!canSave}>
            保存
          </button>
        </div>

        <div className="dialog-body">
          <div className="dialog-field">
            <label>类型</label>
            <div className="type-segmented">
              <button className={type === 'expense' ? 'active' : ''} onClick={() => { setType('expense'); setCategoryId('') }}>
                支出
              </button>
              <button className={type === 'income' ? 'active' : ''} onClick={() => { setType('income'); setCategoryId('') }}>
                收入
              </button>
            </div>
          </div>

          <div className="dialog-field">
            <label>金额</label>
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

          <div className="dialog-field">
            <label>分类</label>
            <select
              className="filter-select"
              value={categoryId}
              onChange={e => setCategoryId(e.target.value)}
            >
              <option value="">未分类</option>
              {availableCategories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="dialog-field">
            <label>账户</label>
            <select
              className="filter-select"
              value={accountId}
              onChange={e => setAccountId(e.target.value)}
            >
              <option value="">不指定</option>
              {availableAccounts.map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>

          <div className="dialog-field">
            <label>频率</label>
            <div className="freq-grid">
              {(['daily', 'weekly', 'monthly', 'yearly'] as const).map(f => (
                <button
                  key={f}
                  className={`freq-cell ${frequency === f ? 'active' : ''}`}
                  onClick={() => setFrequency(f)}
                >
                  {FREQUENCY_LABEL[f]}
                </button>
              ))}
            </div>
          </div>

          <div className="dialog-field">
            <label>间隔（每 N 个周期）</label>
            <input
              className="form-input"
              type="number"
              min="1"
              max="365"
              value={interval}
              onChange={e => setInterval(e.target.value)}
            />
          </div>

          {frequency === 'monthly' && (
            <div className="dialog-field">
              <label>每月几号</label>
              <div className="day-stepper">
                <button
                  type="button"
                  className="step-btn"
                  onClick={() => setDayOfMonth(String(Math.max(1, dayOfMonthNum - 1)))}
                  disabled={dayOfMonthNum <= 1}
                >−</button>
                <span className="step-value">每月 {dayOfMonthNum} 号</span>
                <button
                  type="button"
                  className="step-btn"
                  onClick={() => setDayOfMonth(String(Math.min(28, dayOfMonthNum + 1)))}
                  disabled={dayOfMonthNum >= 28}
                >+</button>
              </div>
            </div>
          )}

          {frequency === 'weekly' && (
            <div className="dialog-field">
              <label>周几</label>
              <div className="weekday-grid">
                {WEEKDAY_VALUES.map(d => (
                  <button
                    key={d.value}
                    type="button"
                    className={`weekday-cell ${dayOfWeekNum === d.value ? 'active' : ''}`}
                    onClick={() => setDayOfWeek(String(d.value))}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="dialog-row">
            <div className="dialog-field">
              <label>开始日期</label>
              <input
                className="form-input"
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
              />
            </div>
            <div className="dialog-field">
              <label>结束日期（可选）</label>
              <input
                className="form-input"
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="dialog-field">
            <label>备注</label>
            <input
              className="form-input"
              type="text"
              placeholder="例如：月租"
              value={note}
              onChange={e => setNote(e.target.value)}
              maxLength={30}
            />
          </div>

          {isEdit && (
            <button className="delete-btn" onClick={handleDelete}>删除此模板</button>
          )}
        </div>
      </div>
    </div>
  )
}

function formatDate(s: string): string {
  const d = parseISODate(s)
  return `${d.getMonth() + 1}月${d.getDate()}日`
}
