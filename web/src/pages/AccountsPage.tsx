import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, uid } from '../db/db'
import type { Account, AccountType, Transaction } from '../db/models'
import { accountTypeLabel, accountTypeIcon, accountTypeColor } from '../db/models'
import { asCurrency } from '../utils/format'
import CategoryIcon from '../components/CategoryIcon'
import './AccountsPage.css'

type DialogState =
  | { mode: 'closed' }
  | { mode: 'new' }
  | { mode: 'edit'; account: Account }

const ACCOUNT_TYPE_OPTIONS: AccountType[] = ['alipay', 'wechat', 'unionpay', 'transit', 'fixed', 'other']

export default function AccountsPage() {
  const navigate = useNavigate()
  const allAccounts = useLiveQuery(() => db.accounts.toArray(), [], [] as Account[])
  const allTransactions = useLiveQuery(() => db.transactions.toArray(), [], [] as Transaction[])

  const [dialog, setDialog] = useState<DialogState>({ mode: 'closed' })

  const sortedAccounts = useMemo(
    () => allAccounts.slice().sort((a, b) => a.sortOrder - b.sortOrder),
    [allAccounts]
  )

  const balances = useMemo(() => {
    const map = new Map<string, number>()
    for (const acc of sortedAccounts) {
      map.set(acc.id, acc.initialBalance)
    }
    for (const t of allTransactions) {
      if (t.type === 'transfer') {
        if (t.accountId) {
          const cur = map.get(t.accountId) ?? 0
          map.set(t.accountId, cur - t.amount)
        }
        if (t.toAccountId) {
          const cur = map.get(t.toAccountId) ?? 0
          map.set(t.toAccountId, cur + t.amount)
        }
      } else {
        if (!t.accountId) continue
        const cur = map.get(t.accountId) ?? 0
        if (t.type === 'income') map.set(t.accountId, cur + t.amount)
        else if (t.type === 'expense') map.set(t.accountId, cur - t.amount)
      }
    }
    return map
  }, [sortedAccounts, allTransactions])

  const { liquidAccounts, fixedAccounts, totalAssets, liquidTotal, fixedTotal } = useMemo(() => {
    const liquid = sortedAccounts.filter(a => a.type !== 'fixed')
    const fixed = sortedAccounts.filter(a => a.type === 'fixed')
    const liquidTotal = liquid.reduce((s, a) => s + (balances.get(a.id) ?? 0), 0)
    const fixedTotal = fixed.reduce((s, a) => s + (balances.get(a.id) ?? 0), 0)
    return {
      liquidAccounts: liquid,
      fixedAccounts: fixed,
      totalAssets: liquidTotal + fixedTotal,
      liquidTotal,
      fixedTotal
    }
  }, [sortedAccounts, balances])

  return (
    <div className="page accounts-page">
      <header className="page-header">
        <h1>资产</h1>
        <button className="header-action" onClick={() => setDialog({ mode: 'new' })}>
          + 添加
        </button>
      </header>

      <div className="card assets-summary">
        <div className="assets-label">总资产</div>
        <div className="assets-amount">{asCurrency(totalAssets)}</div>
        <div className="assets-breakdown">
          <div className="assets-cell">
            <span className="assets-cell-label">流动</span>
            <span className="assets-cell-value">{asCurrency(liquidTotal)}</span>
          </div>
          <div className="assets-divider" />
          <div className="assets-cell">
            <span className="assets-cell-label">定期</span>
            <span className="assets-cell-value">{asCurrency(fixedTotal)}</span>
          </div>
        </div>
      </div>

      <section className="account-section">
        <div className="section-header">
          <span className="section-title">流动账户</span>
          <span className="section-count">{liquidAccounts.length} 个</span>
        </div>
        {liquidAccounts.length === 0 ? (
          <div className="card account-empty">暂无流动账户</div>
        ) : (
          <div className="card account-list">
            {liquidAccounts.map(acc => (
              <AccountRow
                key={acc.id}
                account={acc}
                balance={balances.get(acc.id) ?? 0}
                onClick={() => navigate(`/accounts/${acc.id}`)}
              />
            ))}
          </div>
        )}
      </section>

      <section className="account-section">
        <div className="section-header">
          <span className="section-title">定期 / 储蓄</span>
          <span className="section-count">{fixedAccounts.length} 个</span>
        </div>
        {fixedAccounts.length === 0 ? (
          <div className="card account-empty">暂无定期账户</div>
        ) : (
          <div className="card account-list">
            {fixedAccounts.map(acc => (
              <AccountRow
                key={acc.id}
                account={acc}
                balance={balances.get(acc.id) ?? 0}
                onClick={() => navigate(`/accounts/${acc.id}`)}
              />
            ))}
          </div>
        )}
      </section>

      {dialog.mode !== 'closed' && (
        <AccountDialog
          state={dialog}
          onClose={() => setDialog({ mode: 'closed' })}
        />
      )}
    </div>
  )
}

interface AccountRowProps {
  account: Account
  balance: number
  onClick: () => void
}

function AccountRow({ account, balance, onClick }: AccountRowProps) {
  return (
    <div className="account-row" onClick={onClick}>
      <CategoryIcon icon={account.icon} color={account.colorHex} size={40} />
      <div className="account-info">
        <div className="account-name">{account.name}</div>
        <div className="account-type">{accountTypeLabel[account.type]}</div>
      </div>
      <div className={`account-balance ${balance < 0 ? 'negative' : ''}`}>
        {asCurrency(balance)}
      </div>
    </div>
  )
}

interface DialogProps {
  state: Exclude<DialogState, { mode: 'closed' }>
  onClose: () => void
}

function AccountDialog({ state, onClose }: DialogProps) {
  const isEdit = state.mode === 'edit'
  const existing = isEdit ? state.account : undefined

  const initialType: AccountType = existing?.type ?? 'alipay'
  const [name, setName] = useState(existing?.name ?? '')
  const [type, setType] = useState<AccountType>(initialType)
  const [initialBalance, setInitialBalance] = useState(
    existing ? String(existing.initialBalance) : '0'
  )
  const [icon, setIcon] = useState(existing?.icon ?? accountTypeIcon[initialType])
  const [colorHex, setColorHex] = useState(existing?.colorHex ?? accountTypeColor[initialType])

  const canSave = name.trim().length > 0

  const handleTypeChange = (t: AccountType) => {
    setType(t)
    setIcon(accountTypeIcon[t])
    setColorHex(accountTypeColor[t])
    const isDefaultName = !name.trim() || (Object.values(accountTypeLabel) as string[]).includes(name)
    if (isDefaultName) setName(accountTypeLabel[t])
  }

  const handleSave = async () => {
    if (!canSave) return
    const bal = parseFloat(initialBalance) || 0
    if (existing) {
      await db.accounts.update(existing.id, {
        name: name.trim(),
        type,
        initialBalance: bal,
        icon,
        colorHex
      })
    } else {
      const count = await db.accounts.count()
      await db.accounts.add({
        id: uid(),
        name: name.trim(),
        type,
        icon,
        colorHex,
        initialBalance: bal,
        sortOrder: count,
        isSystem: false,
        createdAt: new Date().toISOString()
      })
    }
    onClose()
  }

  const handleDelete = async () => {
    if (!existing) return
    if (!confirm('删除此账户？相关交易将保留但失去账户关联。')) return
    await db.accounts.delete(existing.id)
    onClose()
  }

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog-sheet" onClick={e => e.stopPropagation()}>
        <div className="dialog-header">
          <button className="dialog-btn" onClick={onClose}>取消</button>
          <span className="dialog-title">{isEdit ? '编辑账户' : '新建账户'}</span>
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
            <label>名称</label>
            <input
              className="form-input"
              type="text"
              placeholder="例如：招行卡"
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="dialog-field">
            <label>类型</label>
            <div className="type-grid">
              {ACCOUNT_TYPE_OPTIONS.map(t => (
                <button
                  key={t}
                  className={`type-cell ${type === t ? 'active' : ''}`}
                  onClick={() => handleTypeChange(t)}
                >
                  {accountTypeLabel[t]}
                </button>
              ))}
            </div>
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

          {isEdit && existing && !existing.isSystem && (
            <button className="delete-btn" onClick={handleDelete}>删除此账户</button>
          )}
        </div>
      </div>
    </div>
  )
}
