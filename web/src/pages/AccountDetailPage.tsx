import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { Account } from '../db/models'
import { accountTypeLabel } from '../db/models'
import { asCurrency } from '../utils/format'
import { toISODate } from '../utils/date'
import { useQuery } from '../hooks/useQuery'
import { useAccounts, refreshAccounts } from '../hooks/useLookup'
import { accountsApi, transactionsApi } from '../api/finflow'
import AccountIcon from '../components/AccountIcon'
import TransactionRow from '../components/TransactionRow'
import EmptyState from '../components/EmptyState'
import './AccountDetailPage.css'

export default function AccountDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()

  const { byId: accsById } = useAccounts()
  const account = id ? accsById.get(id) : undefined
  const { data: allTransactions = [] } = useQuery(() => transactionsApi.list(), [])

  const [filterMonth, setFilterMonth] = useState(new Date())
  const [editing, setEditing] = useState(false)
  const [recharging, setRecharging] = useState(false)

  const accountTransactions = useMemo(
    () => allTransactions.filter(t => t.accountId === id || t.toAccountId === id),
    [allTransactions, id]
  )

  const balance = useMemo(() => {
    if (!account) return 0
    let total = account.initialBalance
    for (const t of accountTransactions) {
      if (t.type === 'transfer') {
        if (t.accountId === id) total -= t.amount
        if (t.toAccountId === id) total += t.amount
      } else if (t.accountId === id) {
        if (t.type === 'income') total += t.amount
        else if (t.type === 'expense') total -= t.amount
      }
    }
    return total
  }, [account, accountTransactions, id])

  const monthTransactions = useMemo(() => {
    const y = filterMonth.getFullYear()
    const m = filterMonth.getMonth() + 1
    const prefix = `${y}-${String(m).padStart(2, '0')}-`
    return accountTransactions
      .filter(t => t.date.startsWith(prefix))
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
  }, [accountTransactions, filterMonth])

  const { monthInflow, monthOutflow } = useMemo(() => {
    let inflow = 0
    let outflow = 0
    for (const t of monthTransactions) {
      if (t.type === 'income' && t.accountId === id) inflow += t.amount
      else if (t.type === 'expense' && t.accountId === id) outflow += t.amount
      else if (t.type === 'transfer') {
        if (t.toAccountId === id) inflow += t.amount
        if (t.accountId === id) outflow += t.amount
      }
    }
    return { monthInflow: inflow, monthOutflow: outflow }
  }, [monthTransactions, id])

  if (!account) {
    return (
      <div className="page account-detail-page">
        <header className="form-header">
          <button className="form-header-btn" onClick={() => navigate(-1)}>返回</button>
          <span className="form-title">账户不存在</span>
          <span className="form-header-btn" />
        </header>
        <div className="card">
          <EmptyState icon="🔍" title="找不到该账户" subtitle="" height={200} />
        </div>
      </div>
    )
  }

  const isTransit = account.type === 'transit'
  const monthLabel = `${filterMonth.getFullYear()}年${filterMonth.getMonth() + 1}月`

  const stepMonth = (delta: number) => {
    setFilterMonth(new Date(filterMonth.getFullYear(), filterMonth.getMonth() + delta, 1))
  }

  const handleDelete = async () => {
    const txCount = accountTransactions.length
    const msg = txCount > 0
      ? `删除此账户？该账户下有 ${txCount} 笔交易，删除后这些交易将保留但失去账户关联。`
      : '删除此账户？'
    if (!confirm(msg)) return
    await accountsApi.remove(account.id)
    await refreshAccounts()
    navigate('/accounts')
  }

  return (
    <div className="page account-detail-page">
      <header className="form-header">
        <button className="form-header-btn" onClick={() => navigate(-1)}>返回</button>
        <span className="form-title">{account.name}</span>
        <button className="form-header-btn" onClick={() => setEditing(true)}>编辑</button>
      </header>

      <div className="card balance-card">
        <div className="balance-top">
          <AccountIcon type={account.type} icon={account.icon} colorHex={account.colorHex} size={48} />
          <div className="balance-meta">
            <div className="balance-type">{accountTypeLabel[account.type]}</div>
            <div className={`balance-amount ${balance < 0 ? 'negative' : ''}`}>
              {asCurrency(balance)}
            </div>
            <div className="balance-label">当前余额</div>
          </div>
        </div>
      </div>

      <div className="card monthly-card">
        <div className="monthly-header">
          <div className="month-switcher">
            <button className="month-nav" onClick={() => stepMonth(-1)} aria-label="上一月">‹</button>
            <span className="month-label">{monthLabel}</span>
            <button className="month-nav" onClick={() => stepMonth(1)} aria-label="下一月">›</button>
          </div>
          {isTransit && (
            <button className="recharge-btn" onClick={() => setRecharging(true)}>
              + 充值
            </button>
          )}
        </div>
        <div className="monthly-stats">
          <div className="stat-cell">
            <span className="stat-label">流入</span>
            <span className="stat-value income">+{asCurrency(monthInflow)}</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-cell">
            <span className="stat-label">流出</span>
            <span className="stat-value expense">-{asCurrency(monthOutflow)}</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-cell">
            <span className="stat-label">净变动</span>
            <span className="stat-value net">
              {monthInflow - monthOutflow >= 0 ? '+' : '-'}{asCurrency(Math.abs(monthInflow - monthOutflow))}
            </span>
          </div>
        </div>
      </div>

      <section className="flow-section">
        <div className="section-header">
          <span className="section-title">{monthLabel} 流水</span>
          <span className="section-count">{monthTransactions.length} 笔</span>
        </div>
        {monthTransactions.length === 0 ? (
          <div className="card">
            <EmptyState icon="📋" title="本月无记录" subtitle="" height={140} />
          </div>
        ) : (
          <div className="card flow-list">
            {monthTransactions.map(t => (
              <div
                key={t.id}
                className="flow-row"
                onClick={() => navigate(`/transactions/${t.id}`)}
              >
                <TransactionRow transaction={t} />
              </div>
            ))}
          </div>
        )}
      </section>

      {editing && (
        <EditAccountDialog account={account} onClose={() => setEditing(false)} />
      )}
      {recharging && (
        <RechargeDialog account={account} onClose={() => setRecharging(false)} />
      )}

      {!account.isSystem && (
        <button className="danger-zone-btn" onClick={handleDelete}>
          删除此账户
        </button>
      )}
    </div>
  )
}

interface EditProps {
  account: Account
  onClose: () => void
}

function EditAccountDialog({ account, onClose }: EditProps) {
  const navigate = useNavigate()
  const [name, setName] = useState(account.name)
  const [icon, setIcon] = useState(account.icon)
  const [colorHex, setColorHex] = useState(account.colorHex)
  const [initialBalance, setInitialBalance] = useState(String(account.initialBalance))

  const handleSave = async () => {
    if (!name.trim()) return
    await accountsApi.update(account.id, {
      name: name.trim(),
      icon,
      colorHex,
      initialBalance: parseFloat(initialBalance) || 0
    })
    await refreshAccounts()
    onClose()
  }

  const handleDelete = async () => {
    if (!confirm('删除此账户？相关交易将保留但失去账户关联。')) return
    await accountsApi.remove(account.id)
    await refreshAccounts()
    onClose()
    navigate('/accounts')
  }

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog-sheet" onClick={e => e.stopPropagation()}>
        <div className="dialog-header">
          <button className="dialog-btn" onClick={onClose}>取消</button>
          <span className="dialog-title">编辑账户</span>
          <button className="dialog-btn primary" onClick={handleSave} disabled={!name.trim()}>
            保存
          </button>
        </div>
        <div className="dialog-body">
          <div className="dialog-field">
            <label>名称</label>
            <input
              className="form-input"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
            />
          </div>
          <div className="dialog-field">
            <label>初始余额</label>
            <div className="amount-input-wrap">
              <span className="amount-currency">¥</span>
              <input
                className="amount-input"
                type="text"
                inputMode="decimal"
                value={initialBalance}
                onChange={e => setInitialBalance(e.target.value)}
              />
            </div>
          </div>
          <div className="dialog-field">
            <label>图标</label>
            <input
              className="form-input"
              type="text"
              value={icon}
              onChange={e => setIcon(e.target.value)}
              maxLength={4}
            />
          </div>
          <div className="dialog-field">
            <label>颜色</label>
            <div className="color-row">
              {['#5B8DEF', '#34D399', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#6B7280'].map(c => (
                <button
                  key={c}
                  className={`color-dot ${colorHex === c ? 'active' : ''}`}
                  style={{ background: c }}
                  onClick={() => setColorHex(c)}
                  aria-label={c}
                />
              ))}
            </div>
          </div>
          {!account.isSystem && (
            <button className="delete-btn" onClick={handleDelete}>删除此账户</button>
          )}
        </div>
      </div>
    </div>
  )
}

interface RechargeProps {
  account: Account
  onClose: () => void
}

function RechargeDialog({ account, onClose }: RechargeProps) {
  const { list: allAccounts = [] } = useAccounts()

  const sources = useMemo(
    () => allAccounts.filter(a => a.id !== account.id && a.type !== 'fixed'),
    [allAccounts, account.id]
  )

  const [sourceId, setSourceId] = useState<string>('')
  const [amountText, setAmountText] = useState('')
  const [note, setNote] = useState('')

  useEffect(() => {
    if (!sourceId && sources.length > 0) setSourceId(sources[0].id)
  }, [sources, sourceId])

  const amount = parseFloat(amountText) || 0
  const canSave = amount > 0 && Boolean(sourceId)

  const handleSave = async () => {
    if (!canSave || !sourceId) return
    await transactionsApi.create({
      amount,
      type: 'transfer',
      note: note.trim() || `${account.name} 充值`,
      date: toISODate(new Date()),
      time: `${new Date().getHours().toString().padStart(2, '0')}:${new Date().getMinutes().toString().padStart(2, '0')}`,
      accountId: sourceId,
      toAccountId: account.id,
      sourceType: 'recharge'
    })
    onClose()
  }

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog-sheet" onClick={e => e.stopPropagation()}>
        <div className="dialog-header">
          <button className="dialog-btn" onClick={onClose}>取消</button>
          <span className="dialog-title">{account.name} 充值</span>
          <button className="dialog-btn primary" onClick={handleSave} disabled={!canSave}>
            保存
          </button>
        </div>
        <div className="dialog-body">
          <div className="dialog-field">
            <label>来源账户</label>
            {sources.length === 0 ? (
              <div className="placeholder">暂无可选来源账户</div>
            ) : (
              <select
                className="form-input"
                value={sourceId}
                onChange={e => setSourceId(e.target.value)}
              >
                {sources.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            )}
          </div>
          <div className="dialog-field">
            <label>充值金额</label>
            <div className="amount-input-wrap">
              <span className="amount-currency">¥</span>
              <input
                className="amount-input"
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={amountText}
                onChange={e => setAmountText(e.target.value)}
                autoFocus
              />
            </div>
          </div>
          <div className="dialog-field">
            <label>备注（可选）</label>
            <input
              className="form-input"
              type="text"
              placeholder="例如：地铁卡充值"
              value={note}
              onChange={e => setNote(e.target.value)}
              maxLength={30}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
