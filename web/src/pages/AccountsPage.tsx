import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import ReactECharts from 'echarts-for-react'
import { db, uid } from '../db/db'
import type { Account, AccountType, BankPreset, Transaction } from '../db/models'
import {
  accountTypeLabel,
  accountTypeIcon,
  accountTypeColor,
  BANK_PRESETS,
  ACCOUNT_SUBTYPE_PRESETS
} from '../db/models'
import { asCurrency } from '../utils/format'
import { chartColors } from '../utils/chartTheme'
import { useTheme } from '../hooks/useTheme'
import AccountIcon from '../components/AccountIcon'
import './AccountsPage.css'

type DialogState =
  | { mode: 'closed' }
  | { mode: 'new' }
  | { mode: 'edit'; account: Account }
  | { mode: 'initial' }

const ACCOUNT_TYPE_OPTIONS: AccountType[] = ['alipay', 'wechat', 'unionpay', 'visa', 'bank', 'transit', 'fixed', 'other']

function isDefaultAccountName(name: string): boolean {
  if (!name.trim()) return true
  if ((Object.values(accountTypeLabel) as string[]).includes(name)) return true
  if (BANK_PRESETS.some(b => b.name === name)) return true
  for (const t of ['alipay', 'wechat'] as const) {
    const base = accountTypeLabel[t]
    if (ACCOUNT_SUBTYPE_PRESETS[t].some(s => name === `${base}${s}`)) return true
  }
  return false
}

export default function AccountsPage() {
  const navigate = useNavigate()
  const allAccounts = useLiveQuery(() => db.accounts.toArray(), [], [] as Account[])
  const allTransactions = useLiveQuery(() => db.transactions.toArray(), [], [] as Transaction[])
  const { effective } = useTheme()

  const [dialog, setDialog] = useState<DialogState>({ mode: 'closed' })
  const [hideAmount, setHideAmount] = useState(false)

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

  const netWorthHistory = useMemo(() => {
    const sortedTx = allTransactions
      .slice()
      .filter(t => t.type !== 'transfer')
      .sort((a, b) => a.date.localeCompare(b.date))
    const baseTotal = sortedAccounts.reduce((s, a) => s + a.initialBalance, 0)
    const now = new Date()
    const points: { label: string; value: number }[] = []
    let cursor = 0
    let running = baseTotal
    for (let i = 11; i >= 0; i--) {
      const m = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const isCurrent = i === 0
      const endDay = isCurrent
        ? now.getDate()
        : new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate()
      const endDateStr = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`
      while (cursor < sortedTx.length && sortedTx[cursor].date <= endDateStr) {
        const t = sortedTx[cursor]
        if (t.type === 'income') running += t.amount
        else if (t.type === 'expense') running -= t.amount
        cursor++
      }
      points.push({
        label: `${m.getMonth() + 1}月`,
        value: Math.round(running * 100) / 100
      })
    }
    return points
  }, [sortedAccounts, allTransactions])

  const trendOption = useMemo(() => {
    const c = chartColors()
    const data = netWorthHistory
    return {
      grid: { left: 8, right: 8, top: 16, bottom: 24 },
      tooltip: {
        trigger: 'axis',
        backgroundColor: c.tooltipBg,
        borderColor: c.tooltipBorder,
        borderWidth: 1,
        textStyle: { color: c.textPrimary, fontSize: 12 },
        formatter: (params: Array<{ axisValue: string; value: number }>) =>
          `${params[0]?.axisValue}<br/>¥${(params[0]?.value ?? 0).toLocaleString('zh-CN', { maximumFractionDigits: 2 })}`
      },
      xAxis: {
        type: 'category',
        data: data.map(p => p.label),
        boundaryGap: false,
        axisLabel: {
          color: c.textMuted,
          fontSize: 10,
          interval: 1
        },
        axisLine: { lineStyle: { color: c.axis } },
        axisTick: { show: false }
      },
      yAxis: {
        type: 'value',
        scale: true,
        axisLabel: { show: false },
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { show: false }
      },
      series: [
        {
          type: 'line',
          data: data.map(p => p.value),
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          showSymbol: false,
          lineStyle: { color: c.accent, width: 2.5 },
          itemStyle: { color: c.accent },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: c.accent + '40' },
                { offset: 1, color: c.accent + '00' }
              ]
            }
          },
          emphasis: { focus: 'series' }
        }
      ]
    }
  }, [netWorthHistory, effective])

  return (
    <div className="page accounts-page">
      <header className="page-header">
        <h1>资产</h1>
        <div className="header-actions">
          <button className="header-action" onClick={() => setDialog({ mode: 'initial' })}>
            期初余额
          </button>
          <button className="header-action" onClick={() => setDialog({ mode: 'new' })}>
            + 新账户
          </button>
        </div>
      </header>

      <div className="card assets-summary">
        <div className="assets-label-row">
          <span className="assets-label">总资产</span>
          <button
            className="eye-btn"
            onClick={() => setHideAmount(v => !v)}
            aria-label={hideAmount ? '显示金额' : '隐藏金额'}
          >
            {hideAmount ? '🙈' : '👁'}
          </button>
        </div>
        <div className="assets-amount">{hideAmount ? '¥ ∗ ∗ ∗ ∗' : asCurrency(totalAssets)}</div>
        <div className="assets-breakdown">
          <div className="assets-cell">
            <span className="assets-cell-label">流动</span>
            <span className="assets-cell-value">
              {hideAmount ? '∗∗∗∗' : asCurrency(liquidTotal)}
            </span>
          </div>
          <div className="assets-divider" />
          <div className="assets-cell">
            <span className="assets-cell-label">定期</span>
            <span className="assets-cell-value">
              {hideAmount ? '∗∗∗∗' : asCurrency(fixedTotal)}
            </span>
          </div>
        </div>
      </div>

      {netWorthHistory.length > 0 && (
        <div className="card trend-card">
          <div className="trend-header">
            <span className="trend-title">净资产趋势 · 近 12 个月</span>
          </div>
          <ReactECharts
            option={trendOption}
            style={{ height: 120 }}
            opts={{ renderer: 'svg' }}
            notMerge
            lazyUpdate
          />
        </div>
      )}

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
                hideAmount={hideAmount}
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
                hideAmount={hideAmount}
                onClick={() => navigate(`/accounts/${acc.id}`)}
              />
            ))}
          </div>
        )}
      </section>

      {dialog.mode !== 'closed' && (
        dialog.mode === 'initial' ? (
          <InitialBalanceDialog
            accounts={sortedAccounts}
            onClose={() => setDialog({ mode: 'closed' })}
          />
        ) : (
          <AccountDialog
            state={dialog}
            onClose={() => setDialog({ mode: 'closed' })}
          />
        )
      )}
    </div>
  )
}

interface AccountRowProps {
  account: Account
  balance: number
  hideAmount?: boolean
  onClick: () => void
}

function AccountRow({ account, balance, onClick, hideAmount }: AccountRowProps) {
  return (
    <div className="account-row" onClick={onClick}>
      <AccountIcon type={account.type} icon={account.icon} colorHex={account.colorHex} size={40} />
      <div className="account-info">
        <div className="account-name">{account.name}</div>
        <div className="account-type">{accountTypeLabel[account.type]}</div>
      </div>
      <div className={`account-balance ${balance < 0 ? 'negative' : ''}`}>
        {hideAmount ? '∗∗∗∗' : asCurrency(balance)}
      </div>
    </div>
  )
}

interface DialogProps {
  state: Exclude<DialogState, { mode: 'closed' }>
  onClose: () => void
}

interface InitialBalanceDialogProps {
  accounts: Account[]
  onClose: () => void
}

function InitialBalanceDialog({ accounts, onClose }: InitialBalanceDialogProps) {
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '')
  const current = accounts.find(a => a.id === accountId)
  const [amount, setAmount] = useState(current ? String(current.initialBalance) : '0')

  const selectAccount = (id: string) => {
    const acc = accounts.find(a => a.id === id)
    setAccountId(id)
    setAmount(acc ? String(acc.initialBalance) : '0')
  }

  const canSave = accountId.length > 0

  const handleSave = async () => {
    if (!canSave) return
    const value = parseFloat(amount) || 0
    await db.accounts.update(accountId, { initialBalance: value })
    onClose()
  }

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog-sheet" onClick={e => e.stopPropagation()}>
        <div className="dialog-header">
          <button className="dialog-btn" onClick={onClose}>取消</button>
          <span className="dialog-title">期初余额</span>
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
            <label>账户</label>
            <div className="account-picker">
              {accounts.map(acc => (
                <button
                  key={acc.id}
                  className={`account-pick-row ${accountId === acc.id ? 'active' : ''}`}
                  onClick={() => selectAccount(acc.id)}
                >
                  <AccountIcon type={acc.type} icon={acc.icon} colorHex={acc.colorHex} size={32} />
                  <div className="account-pick-info">
                    <div className="account-pick-name">{acc.name}</div>
                    <div className="account-pick-balance">
                      当前期初：¥{acc.initialBalance.toFixed(2)}
                    </div>
                  </div>
                  {accountId === acc.id && <span className="account-pick-check">✓</span>}
                </button>
              ))}
            </div>
          </div>

          <div className="dialog-field">
            <label>期初余额（不计入收支）</label>
            <div className="amount-input-wrap">
              <span className="amount-currency">¥</span>
              <input
                className="amount-input"
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                autoFocus
              />
            </div>
            <div className="dialog-hint">
              此金额仅用于资产显示，不会出现在收支统计、报表或预算中。可随时调整。
            </div>
          </div>
        </div>
      </div>
    </div>
  )
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
    if (isDefaultAccountName(name)) setName(accountTypeLabel[t])
  }

  const handleBankSelect = (bank: BankPreset) => {
    setIcon(bank.code)
    setColorHex(bank.colorHex)
    if (isDefaultAccountName(name)) setName(bank.name)
  }

  const handleSubtypeSelect = (subtype: string) => {
    const base = accountTypeLabel[type]
    setName(`${base}${subtype}`)
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

          {type === 'bank' && (
            <div className="dialog-field">
              <label>开户行</label>
              <div className="bank-grid">
                {BANK_PRESETS.map(bank => (
                  <button
                    key={bank.code}
                    className={`bank-cell ${icon === bank.code ? 'active' : ''}`}
                    onClick={() => handleBankSelect(bank)}
                    style={icon === bank.code ? { borderColor: bank.colorHex, background: bank.colorHex + '14' } : undefined}
                  >
                    <span
                      className="bank-cell-icon"
                      style={{ background: bank.colorHex + '22', color: bank.colorHex, borderColor: bank.colorHex + '44' }}
                    >
                      {bank.abbr}
                    </span>
                    <span className="bank-cell-name">{bank.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {(type === 'alipay' || type === 'wechat') && (
            <div className="dialog-field">
              <label>账户细分</label>
              <div className="subtype-row">
                {ACCOUNT_SUBTYPE_PRESETS[type].map(sub => {
                  const full = `${accountTypeLabel[type]}${sub}`
                  return (
                    <button
                      key={sub}
                      className={`subtype-chip ${name === full ? 'active' : ''}`}
                      onClick={() => handleSubtypeSelect(sub)}
                    >
                      {sub}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

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
            <div className="dialog-hint">
              开户时已有的资金，仅用于资产显示，不计入收支统计。后续可点「期初余额」按钮调整。
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
