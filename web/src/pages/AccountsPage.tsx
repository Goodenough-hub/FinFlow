import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ReactECharts from 'echarts-for-react'
import type { Account, AccountType, BankPreset } from '../db/models'
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
import { useQuery } from '../hooks/useQuery'
import { useAccounts, refreshAccounts } from '../hooks/useLookup'
import { accountsApi, transactionsApi } from '../api/finflow'
import AccountIcon from '../components/AccountIcon'
import AddSubAccountDialog from '../components/AddSubAccountDialog'
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
  const { list: allAccounts = [] } = useAccounts()
  const { data: allTransactions = [] } = useQuery(() => transactionsApi.list(), [])
  const { effective } = useTheme()

  const [dialog, setDialog] = useState<DialogState>({ mode: 'closed' })
  const [hideAmount, setHideAmount] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [addingChildFor, setAddingChildFor] = useState<Account | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

  const handleDeleteAccount = async (acc: Account) => {
    if (acc.isSystem) return
    const children = allAccounts.filter(a => a.parentId === acc.id)
    if (children.length > 0) {
      if (!confirm(`此账户下有 ${children.length} 个子账户，将一并删除。相关交易会保留但失去账户关联。继续？`)) return
      for (const c of children) {
        await accountsApi.remove(c.id)
      }
    } else {
      if (!confirm('删除此账户？相关交易将保留但失去账户关联。')) return
    }
    await accountsApi.remove(acc.id)
    await refreshAccounts()
  }

  const sortedAccounts = useMemo(
    () => allAccounts.slice().sort((a, b) => a.sortOrder - b.sortOrder),
    [allAccounts]
  )

  const childrenMap = useMemo(() => {
    const m = new Map<string, Account[]>()
    for (const a of sortedAccounts) {
      if (!a.parentId) continue
      const arr = m.get(a.parentId) ?? []
      arr.push(a)
      m.set(a.parentId, arr)
    }
    return m
  }, [sortedAccounts])

  const rootAccounts = useMemo(
    () => sortedAccounts.filter(a => !a.parentId),
    [sortedAccounts]
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
    const liquid = rootAccounts.filter(a => a.type !== 'fixed')
    const fixed = rootAccounts.filter(a => a.type === 'fixed')
    // 汇总只算叶子账户（无子账户的主账户 + 所有子账户）
    const leafSum = (roots: Account[]) => roots.reduce((s, a) => {
      const kids = childrenMap.get(a.id) ?? []
      if (kids.length === 0) return s + (balances.get(a.id) ?? 0)
      return s + kids.reduce((cs, k) => cs + (balances.get(k.id) ?? 0), 0)
    }, 0)
    const liquidTotal = leafSum(liquid)
    const fixedTotal = leafSum(fixed)
    return {
      liquidAccounts: liquid,
      fixedAccounts: fixed,
      totalAssets: liquidTotal + fixedTotal,
      liquidTotal,
      fixedTotal
    }
  }, [rootAccounts, childrenMap, balances])

  const reorderAccounts = async (group: 'liquid' | 'fixed', fromId: string, toId: string) => {
    const list = group === 'liquid' ? liquidAccounts : fixedAccounts
    const fromIdx = list.findIndex(a => a.id === fromId)
    const toIdx = list.findIndex(a => a.id === toId)
    if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return
    const newList = list.slice()
    const [moved] = newList.splice(fromIdx, 1)
    newList.splice(toIdx, 0, moved)
    const offset = group === 'liquid' ? 0 : 1000
    await Promise.all(newList.map((a, i) =>
      a.sortOrder !== offset + i
        ? accountsApi.update(a.id, { ...a, sortOrder: offset + i })
        : Promise.resolve()
    ))
    await refreshAccounts()
  }

  const handleDragStart = (id: string) => setDraggingId(id)
  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault()
    if (id !== draggingId) setDragOverId(id)
  }
  const handleDragEnd = () => {
    setDraggingId(null)
    setDragOverId(null)
  }
  const handleDrop = async (group: 'liquid' | 'fixed', targetId: string) => {
    if (!draggingId) return
    await reorderAccounts(group, draggingId, targetId)
    handleDragEnd()
  }

  const netWorthHistory = useMemo(() => {
    const sortedTx = allTransactions
      .slice()
      .filter(t => t.type !== 'transfer')
      .sort((a, b) => a.date.localeCompare(b.date))
    const baseTotal = sortedAccounts
      .filter(a => !childrenMap.has(a.id))
      .reduce((s, a) => s + a.initialBalance, 0)
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
  }, [sortedAccounts, childrenMap, allTransactions])

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
          <button
            className="header-action"
            onClick={() => setDialog({ mode: 'initial' })}
          >
            期初余额
          </button>
          <button
            className={`header-action ${editMode ? 'active' : ''}`}
            onClick={() => setEditMode(v => !v)}
          >
            {editMode ? '完成' : '编辑'}
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
              <AccountRowGroup
                key={acc.id}
                account={acc}
                children={childrenMap.get(acc.id) ?? []}
                balances={balances}
                hideAmount={hideAmount}
                editMode={editMode}
                onNavigate={(id) => navigate(`/accounts/${id}`)}
                onDelete={handleDeleteAccount}
                onAddChild={(acc) => setAddingChildFor(acc)}
                draggable={editMode}
                isDragging={draggingId === acc.id}
                isDragOver={dragOverId === acc.id && draggingId !== acc.id}
                onDragStart={() => handleDragStart(acc.id)}
                onDragOver={(e) => handleDragOver(e, acc.id)}
                onDrop={() => handleDrop('liquid', acc.id)}
                onDragEnd={handleDragEnd}
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
              <AccountRowGroup
                key={acc.id}
                account={acc}
                children={childrenMap.get(acc.id) ?? []}
                balances={balances}
                hideAmount={hideAmount}
                editMode={editMode}
                onNavigate={(id) => navigate(`/accounts/${id}`)}
                onDelete={handleDeleteAccount}
                onAddChild={(acc) => setAddingChildFor(acc)}
                draggable={editMode}
                isDragging={draggingId === acc.id}
                isDragOver={dragOverId === acc.id && draggingId !== acc.id}
                onDragStart={() => handleDragStart(acc.id)}
                onDragOver={(e) => handleDragOver(e, acc.id)}
                onDrop={() => handleDrop('fixed', acc.id)}
                onDragEnd={handleDragEnd}
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

      {addingChildFor && (
        <AddSubAccountDialog
          parentId={addingChildFor.id}
          parentType={addingChildFor.type}
          parentColor={addingChildFor.colorHex}
          nextOrder={(childrenMap.get(addingChildFor.id) ?? []).length}
          onClose={() => setAddingChildFor(null)}
        />
      )}
    </div>
  )
}

interface AccountRowGroupProps {
  account: Account
  children: Account[]
  balances: Map<string, number>
  hideAmount?: boolean
  editMode?: boolean
  onNavigate: (id: string) => void
  onDelete: (acc: Account) => void | Promise<void>
  onAddChild: (acc: Account) => void
  draggable?: boolean
  isDragging?: boolean
  isDragOver?: boolean
  onDragStart?: () => void
  onDragOver?: (e: React.DragEvent) => void
  onDrop?: () => void
  onDragEnd?: () => void
}

function AccountRowGroup({
  account, children, balances, hideAmount, editMode, onNavigate, onDelete, onAddChild,
  draggable, isDragging, isDragOver, onDragStart, onDragOver, onDrop, onDragEnd
}: AccountRowGroupProps) {
  const hasChildren = children.length > 0
  // 主账户余额：叶子直接取余额；分组容器=子账户之和
  const mainBalance = hasChildren
    ? children.reduce((s, k) => s + (balances.get(k.id) ?? 0), 0)
    : (balances.get(account.id) ?? 0)

  return (
    <>
      <div
        className={`account-row ${editMode ? 'edit-mode' : ''} ${hasChildren ? 'has-children' : ''} ${isDragging ? 'dragging' : ''} ${isDragOver ? 'drag-over' : ''}`}
        draggable={draggable}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onDragEnd={onDragEnd}
        onClick={() => onNavigate(account.id)}
      >
        <AccountIcon type={account.type} icon={account.icon} colorHex={account.colorHex} size={40} />
        <div className="account-info">
          <div className="account-name">{account.name}</div>
          <div className="account-type">{accountTypeLabel[account.type]}</div>
        </div>
        <div className={`account-balance ${mainBalance < 0 ? 'negative' : ''}`}>
          {hideAmount ? '∗∗∗∗' : asCurrency(mainBalance)}
        </div>
        {editMode && (
          <button
            className="account-row-add"
            onClick={(e) => {
              e.stopPropagation()
              onAddChild(account)
            }}
            aria-label="添加子账户"
          >
            +
          </button>
        )}
        {editMode && !account.isSystem && (
          <button
            className="account-row-delete"
            onClick={(e) => {
              e.stopPropagation()
              onDelete(account)
            }}
            aria-label="删除账户"
          >
            ×
          </button>
        )}
        {editMode && account.isSystem && <div className="account-row-placeholder" />}
      </div>
    </>
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
    await accountsApi.update(accountId, { initialBalance: value })
    await refreshAccounts()
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

  const { list: allAccounts = [] } = useAccounts()

  const initialType: AccountType = existing?.type ?? 'alipay'
  const [name, setName] = useState(existing?.name ?? '')
  const [type, setType] = useState<AccountType>(initialType)
  const [initialBalance, setInitialBalance] = useState(
    existing ? String(existing.initialBalance) : '0'
  )
  const [icon, setIcon] = useState(existing?.icon ?? accountTypeIcon[initialType])
  const [colorHex, setColorHex] = useState(existing?.colorHex ?? accountTypeColor[initialType])
  const [mode, setMode] = useState<'standalone' | 'child'>(existing?.parentId ? 'child' : 'standalone')
  const [parentId, setParentId] = useState<string>(existing?.parentId ?? '')
  // 主账户模式下：选中的子账户预设（银行 code 或细分名）
  const [selectedChildPresets, setSelectedChildPresets] = useState<string[]>([])
  const [childBalances, setChildBalances] = useState<Record<string, string>>({})

  // 父账户候选：所有根账户（容器）
  const parentCandidates = useMemo(
    () => allAccounts.filter(a => !a.parentId).sort((a, b) => a.sortOrder - b.sortOrder),
    [allAccounts]
  )
  const parent = parentCandidates.find(a => a.id === parentId)
  // 子账户模式继承父账户类型
  const effectiveType: AccountType = (mode === 'child' && parent) ? parent.type : type

  const canSave = mode === 'standalone' || Boolean(parentId)

  const handleTypeChange = (t: AccountType) => {
    setType(t)
    setIcon(accountTypeIcon[t])
    setColorHex(accountTypeColor[t])
    if (isDefaultAccountName(name)) setName(accountTypeLabel[t])
  }

  const handleParentChange = (id: string) => {
    const p = allAccounts.find(a => a.id === id)
    setParentId(id)
    if (p) {
      setType(p.type)
      setIcon(accountTypeIcon[p.type])
      setColorHex(accountTypeColor[p.type])
      if (isDefaultAccountName(name)) setName(accountTypeLabel[p.type])
    }
  }

  const handleBankSelect = (bank: BankPreset) => {
    setIcon(bank.code)
    setColorHex(bank.colorHex)
    if (isDefaultAccountName(name)) setName(bank.name)
  }

  const handleSubtypeSelect = (subtype: string) => {
    const base = accountTypeLabel[effectiveType]
    setName(`${base}${subtype}`)
  }

  const handleSave = async () => {
    if (!canSave) return
    const bal = parseFloat(initialBalance) || 0
    // 名称留空时用默认名（选了银行用银行名，否则用类型名）
    const bankMatch = BANK_PRESETS.find(b => b.code === icon)
    const fallbackName = bankMatch?.name ?? accountTypeLabel[effectiveType]
    const finalName = name.trim() || fallbackName
    if (existing) {
      await accountsApi.update(existing.id, {
        name: finalName,
        type: effectiveType,
        initialBalance: bal,
        icon,
        colorHex,
        parentId: mode === 'child' ? parentId : undefined
      })
    } else {
      const siblings = allAccounts.filter(a => a.parentId === parentId)
      const created = await accountsApi.create({
        name: finalName,
        type: effectiveType,
        icon,
        colorHex,
        initialBalance: bal,
        sortOrder: mode === 'child' ? siblings.length : 0,
        isSystem: false,
        parentId: mode === 'child' ? parentId : undefined
      })
      // 主账户模式下，同时创建选中的子账户
      if (mode === 'standalone' && selectedChildPresets.length > 0) {
        const isBankType = ['bank', 'unionpay', 'visa', 'fixed'].includes(effectiveType)
        for (let i = 0; i < selectedChildPresets.length; i++) {
          const code = selectedChildPresets[i]
          const bal = parseFloat(childBalances[code] ?? '') || 0
          if (isBankType) {
            const bank = BANK_PRESETS.find(b => b.code === code)
            if (!bank) continue
            await accountsApi.create({
              name: bank.name,
              type: 'bank',
              icon: bank.code,
              colorHex: bank.colorHex,
              initialBalance: bal,
              sortOrder: i,
              isSystem: false,
              parentId: created.id
            })
          } else {
            // alipay/wechat 细分
            await accountsApi.create({
              name: `${accountTypeLabel[effectiveType]}${code}`,
              type: effectiveType,
              icon: accountTypeIcon[effectiveType],
              colorHex: accountTypeColor[effectiveType],
              initialBalance: bal,
              sortOrder: i,
              isSystem: false,
              parentId: created.id
            })
          }
        }
      }
    }
    await refreshAccounts()
    onClose()
  }

  const handleDelete = async () => {
    if (!existing) return
    if (!confirm('删除此账户？相关交易将保留但失去账户关联。')) return
    await accountsApi.remove(existing.id)
    await refreshAccounts()
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
            <label>名称（可选）</label>
            <input
              className="form-input"
              type="text"
              placeholder="留空将自动使用类型或银行名"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          {!isEdit && (
            <div className="dialog-field">
              <label>账户形式</label>
              <div className="subtype-row">
                <button
                  className={`subtype-chip ${mode === 'standalone' ? 'active' : ''}`}
                  onClick={() => setMode('standalone')}
                >
                  主账户（容器）
                </button>
                <button
                  className={`subtype-chip ${mode === 'child' ? 'active' : ''}`}
                  onClick={() => setMode('child')}
                >
                  子账户
                </button>
              </div>
              {mode === 'standalone' && (
                <div className="dialog-hint" style={{ marginTop: 8 }}>
                  主账户直接显示在资产页。给它加子账户（如多张银行卡）后会自动成为容器，资产页只显示容器一行，余额汇总。
                </div>
              )}
              {mode === 'child' && (
                <div className="dialog-hint" style={{ marginTop: 8 }}>
                  子账户挂在某个已有容器下（如云闪付下的银行卡），不单独显示在资产页。若无容器可选，请先选「主账户」创建一个。
                </div>
              )}
            </div>
          )}

          <div className="dialog-field">
            <label>类型</label>
            <div className="type-grid">
              {ACCOUNT_TYPE_OPTIONS.map(t => (
                <button
                  key={t}
                  className={`type-cell ${effectiveType === t ? 'active' : ''}`}
                  onClick={() => handleTypeChange(t)}
                  disabled={mode === 'child'}
                  style={mode === 'child' ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
                >
                  {accountTypeLabel[t]}
                </button>
              ))}
            </div>
            {mode === 'child' && (
              <div className="dialog-hint" style={{ marginTop: 8 }}>
                子账户继承父账户类型「{accountTypeLabel[effectiveType]}」
              </div>
            )}
          </div>

          {mode === 'child' && (
            <div className="dialog-field">
              <label>父账户</label>
              {parentCandidates.length === 0 ? (
                <div className="dialog-hint">
                  暂无可用容器。请切到「主账户」先创建一个容器账户（如云闪付、支付宝、银行等），再创建子账户挂到它下面。
                </div>
              ) : (
                <select
                  className="form-input"
                  value={parentId}
                  onChange={e => handleParentChange(e.target.value)}
                >
                  <option value="">请选择父账户</option>
                  {parentCandidates.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.name}（{accountTypeLabel[a.type]}）
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {(effectiveType === 'bank' || effectiveType === 'unionpay' || effectiveType === 'visa' || effectiveType === 'fixed') && (
            <div className="dialog-field">
              <label>{mode === 'standalone' && !isEdit ? '同时创建子账户（可选，多选）' : '开户行'}</label>
              <div className="bank-grid">
                {BANK_PRESETS.map(bank => {
                  const selected = mode === 'standalone' && !isEdit
                    ? selectedChildPresets.includes(bank.code)
                    : icon === bank.code
                  return (
                    <button
                      key={bank.code}
                      className={`bank-cell ${selected ? 'active' : ''}`}
                      onClick={() => {
                        if (mode === 'standalone' && !isEdit) {
                          setSelectedChildPresets(prev => prev.includes(bank.code)
                            ? prev.filter(c => c !== bank.code)
                            : [...prev, bank.code])
                        } else {
                          handleBankSelect(bank)
                        }
                      }}
                      style={selected ? { borderColor: bank.colorHex, background: bank.colorHex + '14' } : undefined}
                    >
                      <span
                        className="bank-cell-icon"
                        style={{ background: bank.colorHex + '22', color: bank.colorHex, borderColor: bank.colorHex + '44' }}
                      >
                        {bank.abbr}
                      </span>
                      <span className="bank-cell-name">{bank.name}</span>
                    </button>
                  )
                })}
              </div>
              {mode === 'standalone' && !isEdit && selectedChildPresets.length > 0 && (
                <div className="child-balance-list">
                  {selectedChildPresets.map(code => {
                    const bank = BANK_PRESETS.find(b => b.code === code)
                    if (!bank) return null
                    return (
                      <div key={code} className="child-balance-row">
                        <span
                          className="child-balance-icon"
                          style={{ background: bank.colorHex + '22', color: bank.colorHex, borderColor: bank.colorHex + '44' }}
                        >
                          {bank.abbr}
                        </span>
                        <span className="child-balance-name">{bank.name}</span>
                        <div className="child-balance-input-wrap">
                          <span className="amount-currency">¥</span>
                          <input
                            className="child-balance-input"
                            type="text"
                            inputMode="decimal"
                            placeholder="0.00"
                            value={childBalances[code] ?? ''}
                            onChange={e => setChildBalances(prev => ({ ...prev, [code]: e.target.value }))}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {(effectiveType === 'alipay' || effectiveType === 'wechat') && (
            <div className="dialog-field">
              <label>{mode === 'standalone' && !isEdit ? '同时创建子账户（可选，多选）' : '账户细分'}</label>
              <div className="subtype-row">
                {ACCOUNT_SUBTYPE_PRESETS[effectiveType].map(sub => {
                  const full = `${accountTypeLabel[effectiveType]}${sub}`
                  const selected = mode === 'standalone' && !isEdit
                    ? selectedChildPresets.includes(sub)
                    : name === full
                  return (
                    <button
                      key={sub}
                      className={`subtype-chip ${selected ? 'active' : ''}`}
                      onClick={() => {
                        if (mode === 'standalone' && !isEdit) {
                          setSelectedChildPresets(prev => prev.includes(sub)
                            ? prev.filter(c => c !== sub)
                            : [...prev, sub])
                        } else {
                          handleSubtypeSelect(sub)
                        }
                      }}
                    >
                      {sub}
                    </button>
                  )
                })}
              </div>
              {mode === 'standalone' && !isEdit && selectedChildPresets.length > 0 && (
                <div className="child-balance-list">
                  {selectedChildPresets.map(sub => (
                    <div key={sub} className="child-balance-row">
                      <span className="child-balance-name">{accountTypeLabel[effectiveType]}·{sub}</span>
                      <div className="child-balance-input-wrap">
                        <span className="amount-currency">¥</span>
                        <input
                          className="child-balance-input"
                          type="text"
                          inputMode="decimal"
                          placeholder="0.00"
                          value={childBalances[sub] ?? ''}
                          onChange={e => setChildBalances(prev => ({ ...prev, [sub]: e.target.value }))}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
