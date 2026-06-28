import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Account, Category, Transaction } from '../db/models'
import { useAuth } from '../contexts/AuthContext'
import { usePWA } from '../hooks/usePWA'
import { useTheme } from '../hooks/useTheme'
import type { ThemeMode } from '../theme'
import { useQuery } from '../hooks/useQuery'
import { useAccounts, useCategories, refreshAllLookups } from '../hooks/useLookup'
import { transactionsApi, categoriesApi, accountsApi } from '../api/finflow'
import { asCurrency } from '../utils/format'
import './SettingsPage.css'

export default function SettingsPage() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { canInstall, installed, offline, install } = usePWA()
  const { data: txs = [] } = useQuery(() => transactionsApi.list(), [])
  const { list: cats = [] } = useCategories()
  const { list: accs = [] } = useAccounts()
  const { mode: theme, setThemeMode } = useTheme()
  const [busy, setBusy] = useState(false)

  const balances = useMemo(() => {
    const map = new Map<string, number>()
    for (const a of accs) map.set(a.id, a.initialBalance)
    for (const t of txs) {
      if (t.type === 'transfer') {
        if (t.accountId) map.set(t.accountId, (map.get(t.accountId) ?? 0) - t.amount)
        if (t.toAccountId) map.set(t.toAccountId, (map.get(t.toAccountId) ?? 0) + t.amount)
      } else {
        if (!t.accountId) continue
        const cur = map.get(t.accountId) ?? 0
        if (t.type === 'income') map.set(t.accountId, cur + t.amount)
        else if (t.type === 'expense') map.set(t.accountId, cur - t.amount)
      }
    }
    return map
  }, [accs, txs])

  const totalAssets = useMemo(
    () => accs.reduce((s, a) => s + (balances.get(a.id) ?? 0), 0),
    [accs, balances]
  )

  const txCount = txs.length
  const catCount = cats.length
  const accCount = accs.length

  const handleThemeChange = (mode: ThemeMode) => setThemeMode(mode)

  const handleLogout = () => {
    if (!confirm('确定退出登录？')) return
    logout()
    navigate('/login', { replace: true })
  }

  const handleFillSample = async () => {
    if (txCount > 0) {
      alert('已存在交易数据，无法填充示例。请先清空所有交易。')
      return
    }
    if (!confirm('填充最近 24 个月示例交易数据？')) return
    setBusy(true)
    try {
      await fillSampleData(cats, accs)
      alert('示例数据已填充')
    } catch (e) {
      alert(`填充失败：${(e as Error).message}`)
    } finally {
      setBusy(false)
    }
  }

  const handleClearAll = async () => {
    if (!confirm('清空所有交易数据？此操作不可恢复！')) return
    if (!confirm('再次确认：将删除全部交易记录，分类和账户保留。')) return
    setBusy(true)
    try {
      await Promise.all(txs.map(t => transactionsApi.remove(t.id)))
      alert('已清空交易数据')
    } catch (e) {
      alert(`清空失败：${(e as Error).message}`)
    } finally {
      setBusy(false)
    }
  }

  const handleExportCSV = async () => {
    if (txs.length === 0) {
      alert('没有可导出的交易')
      return
    }
    const csv = toCSV(txs, cats, accs)
    const dateStr = new Date().toISOString().slice(0, 10)
    download(`FinFlow_Export_${dateStr}.csv`, csv, 'text/csv;charset=utf-8;')
  }

  const handleExportJSON = async () => {
    const payload = { exportedAt: new Date().toISOString(), transactions: txs, categories: cats, accounts: accs }
    download(
      'finflow-backup.json',
      JSON.stringify(payload, null, 2),
      'application/json'
    )
  }

  const handleImportJSON = async (file: File) => {
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      const txsIn = Array.isArray(data?.transactions) ? data.transactions : []
      const catsIn = Array.isArray(data?.categories) ? data.categories : []
      const accsIn = Array.isArray(data?.accounts) ? data.accounts : []
      if (txsIn.length === 0 && catsIn.length === 0 && accsIn.length === 0) {
        alert('未在备份中找到有效数据')
        return
      }
      if (!confirm(`将导入 ${txsIn.length} 笔交易、${catsIn.length} 个分类、${accsIn.length} 个账户。\n注意：备份中的旧 ID 会被忽略，将生成新 ID。当前数据不会被覆盖。\n是否继续？`)) return
      setBusy(true)
      let okTx = 0, okCat = 0, okAcc = 0
      for (const c of catsIn) {
        try { await categoriesApi.create(stripId(c) as any); okCat++ } catch {}
      }
      for (const a of accsIn) {
        try { await accountsApi.create(stripId(a) as any); okAcc++ } catch {}
      }
      await refreshAllLookups()
      for (const t of txsIn) {
        try { await transactionsApi.create(stripId(t) as any); okTx++ } catch {}
      }
      alert(`导入完成：${okTx} 笔交易、${okCat} 个分类、${okAcc} 个账户`)
    } catch (e) {
      alert(`导入失败：${(e as Error).message}`)
    } finally {
      setBusy(false)
    }
  }

  const avatarLetter = (user?.username ?? '?').charAt(0).toUpperCase()

  return (
    <div className="page settings-page">
      <header className="page-header">
        <h1>我的</h1>
      </header>

      <section className="profile-card" onClick={() => navigate('/accounts')}>
        <div className="profile-avatar" style={{
          background: `linear-gradient(135deg, ${avatarColor(user?.username ?? '')}, ${avatarColor(user?.username ?? '', true)})`
        }}>
          {avatarLetter}
        </div>
        <div className="profile-info">
          <div className="profile-name">{user?.username ?? '未登录'}</div>
          <div className="profile-meta">
            <span className="profile-role">{user?.role === 'admin' ? '管理员' : '用户'}</span>
            <span className="profile-sep">·</span>
            <span>总资产 {asCurrency(totalAssets)}</span>
          </div>
        </div>
        <span className="profile-chevron">›</span>
      </section>

      <section className="settings-group">
        <div className="group-title">账户</div>
        <div className="card group-card">
          {accs.length === 0 && (
            <div className="stat-row" style={{ justifyContent: 'center', color: 'var(--text-tertiary)' }}>
              暂无账户
            </div>
          )}
          {accs.map(a => (
            <button
              key={a.id}
              className="action-row"
              onClick={() => navigate(`/accounts/${a.id}`)}
            >
              <span
                className="account-dot"
                style={{ background: a.colorHex || 'var(--accent-blue)' }}
              >
                {a.icon}
              </span>
              <span className="action-label">{a.name}</span>
              <span className="action-value">{asCurrency(balances.get(a.id) ?? 0)}</span>
              <span className="action-chevron">›</span>
            </button>
          ))}
        </div>
      </section>

      <section className="settings-group">
        <div className="group-title">外观</div>
        <div className="card group-card">
          <div className="seg-row">
            {(['dark', 'light', 'auto'] as ThemeMode[]).map(m => (
              <button
                key={m}
                className={`seg-btn ${theme === m ? 'active' : ''}`}
                onClick={() => handleThemeChange(m)}
              >
                {m === 'dark' ? '深色' : m === 'light' ? '浅色' : '跟随系统'}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="settings-group">
        <div className="group-title">管理</div>
        <div className="card group-card">
          <button className="action-row" onClick={() => navigate('/categories')}>
            <span className="action-icon">🗂</span>
            <span className="action-label">分类管理</span>
            <span className="action-value">{catCount}</span>
            <span className="action-chevron">›</span>
          </button>
          <button className="action-row" onClick={() => navigate('/budgets')}>
            <span className="action-icon">🎯</span>
            <span className="action-label">预算管理</span>
            <span className="action-chevron">›</span>
          </button>
          <button className="action-row" onClick={() => navigate('/recurring')}>
            <span className="action-icon">🔁</span>
            <span className="action-label">周期性交易</span>
            <span className="action-chevron">›</span>
          </button>
          <button className="action-row" onClick={() => navigate('/reports')}>
            <span className="action-icon">📊</span>
            <span className="action-label">报表中心</span>
            <span className="action-chevron">›</span>
          </button>
        </div>
      </section>

      <section className="settings-group">
        <div className="group-title">数据</div>
        <div className="card group-card">
          <div className="stat-row">
            <span>交易</span>
            <strong>{txCount}</strong>
          </div>
          <div className="stat-row">
            <span>分类</span>
            <strong>{catCount}</strong>
          </div>
          <div className="stat-row">
            <span>账户</span>
            <strong>{accCount}</strong>
          </div>
        </div>
      </section>

      <section className="settings-group">
        <div className="group-title">导入 / 导出</div>
        <div className="card group-card">
          <button className="action-row" onClick={() => navigate('/import')}>
            <span className="action-icon">📥</span>
            <span className="action-label">导入 CSV</span>
            <span className="action-chevron">›</span>
          </button>
          <button className="action-row" disabled={busy} onClick={handleExportCSV}>
            <span className="action-icon">📄</span>
            <span className="action-label">{busy ? '处理中…' : '导出 CSV'}</span>
            <span className="action-chevron">›</span>
          </button>
          <button className="action-row" disabled={busy} onClick={handleExportJSON}>
            <span className="action-icon">💾</span>
            <span className="action-label">{busy ? '处理中…' : '导出 JSON 备份'}</span>
            <span className="action-chevron">›</span>
          </button>
          <label className="action-row" htmlFor="json-import-input">
            <span className="action-icon">📥</span>
            <span className="action-label">{busy ? '处理中…' : '导入 JSON 备份'}</span>
            <span className="action-chevron">›</span>
            <input
              id="json-import-input"
              type="file"
              accept="application/json,.json"
              hidden
              disabled={busy}
              onChange={e => {
                const f = e.target.files?.[0]
                if (f) handleImportJSON(f)
                e.target.value = ''
              }}
            />
          </label>
        </div>
      </section>

      <section className="settings-group">
        <div className="group-title">示例数据</div>
        <div className="card group-card">
          <button className="action-row" disabled={busy} onClick={handleFillSample}>
            <span className="action-icon">✨</span>
            <span className="action-label">{busy ? '处理中…' : '填充 30 天示例数据'}</span>
            <span className="action-chevron">›</span>
          </button>
          <button className="action-row danger" disabled={busy} onClick={handleClearAll}>
            <span className="action-icon">🗑</span>
            <span className="action-label">{busy ? '处理中…' : '清空所有交易'}</span>
            <span className="action-chevron">›</span>
          </button>
        </div>
      </section>

      <section className="settings-group">
        <div className="group-title">应用</div>
        <div className="card group-card">
          <div className="stat-row">
            <span>运行模式</span>
            <strong>{installed ? '已安装（独立窗口）' : '浏览器模式'}</strong>
          </div>
          <div className="stat-row">
            <span>网络状态</span>
            <strong style={{ color: offline ? 'var(--overspend-red)' : 'var(--income-green)' }}>
              {offline ? '离线' : '在线'}
            </strong>
          </div>
          {canInstall && !installed && (
            <button className="action-row" onClick={install}>
              <span className="action-icon">📲</span>
              <span className="action-label">安装到主屏幕</span>
              <span className="action-chevron">›</span>
            </button>
          )}
          {installed && (
            <div className="stat-row">
              <span>提示</span>
              <strong style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>从主屏幕图标启动可全屏使用</strong>
            </div>
          )}
        </div>
      </section>

      <section className="settings-group">
        <div className="group-title">关于</div>
        <div className="card group-card">
          <div className="stat-row">
            <span>版本</span>
            <strong>FinFlow PWA · v0.2.0</strong>
          </div>
          <div className="stat-row">
            <span>后端</span>
            <strong>AppPilot Server</strong>
          </div>
        </div>
      </section>

      <div className="logout-section">
        <button className="logout-btn" onClick={handleLogout}>退出登录</button>
      </div>
    </div>
  )
}

function avatarColor(seed: string, alt = false): string {
  const colors = [
    ['#007AFF', '#00C6FF'],
    ['#5856D6', '#AF52DE'],
    ['#34C759', '#30D158'],
    ['#FF9500', '#FF6B00'],
    ['#FF3B30', '#FF2D55'],
    ['#AF52DE', '#FF375F'],
    ['#5AC8FA', '#007AFF']
  ]
  let h = 0
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0
  const pair = colors[h % colors.length]
  return alt ? pair[1] : pair[0]
}

function stripId<T extends Record<string, any>>(obj: T): Omit<T, 'id'> {
  const { id: _id, ...rest } = obj
  return rest as Omit<T, 'id'>
}

function download(filename: string, content: string, mime: string) {
  const blob = new Blob(['﻿' + content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function toCSV(
  transactions: Transaction[],
  categories: Category[],
  accounts: Account[]
): string {
  const catMap = new Map(categories.map(c => [c.id, c]))
  const accMap = new Map(accounts.map(a => [a.id, a]))
  const header = ['日期', '时间', '类型', '金额', '分类', '账户', '商家', '备注']
  const lines = [header.join(',')]
  const sorted = transactions.slice().sort((a, b) => b.date.localeCompare(a.date))
  for (const t of sorted) {
    const cat = t.categoryId ? catMap.get(t.categoryId)?.name ?? '' : ''
    const acc = t.accountId ? accMap.get(t.accountId)?.name ?? '' : ''
    const type = t.type === 'income' ? '收入' : t.type === 'expense' ? '支出' : '转账'
    const row = [
      t.date,
      t.time ?? '',
      type,
      String(t.amount),
      cat,
      acc,
      t.vendor ?? '',
      (t.note ?? '').replace(/[\n,]/g, ' ')
    ]
    lines.push(row.map(csvEscape).join(','))
  }
  return lines.join('\n')
}

function csvEscape(s: string): string {
  if (/[",\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

async function fillSampleData(cats: Category[], accs: Account[]) {
  const expenseCats = cats.filter(c => c.type === 'expense')
  const leafCats = expenseCats.filter(c => !cats.some(x => x.parentId === c.id))
  const fallbackExpense = expenseCats
  const incomeCats = cats
    .filter(c => c.type === 'income')
    .filter(c => !cats.some(x => x.parentId === c.id))
  const liquidAccounts = accs.filter(a => a.type !== 'fixed')

  if (leafCats.length === 0 || liquidAccounts.length === 0) return

  const now = new Date()
  const vendors = ['高德', '滴滴', '美团', 'T3出行', '曹操出行']

  const isoDate = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

  const pickTime = () => {
    const h = 7 + Math.floor(Math.random() * 14)
    const m = Math.floor(Math.random() * 60)
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  }

  const batch: Array<Omit<Transaction, 'id' | 'createdAt'>> = []

  for (let monthsAgo = 23; monthsAgo >= 0; monthsAgo--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1)
    const daysInMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate()

    const salaryCat = incomeCats.find(c => c.name === '工资') ?? incomeCats[0]
    if (salaryCat) {
      const payday = new Date(monthStart.getFullYear(), monthStart.getMonth(), Math.min(10, daysInMonth))
      batch.push({
        amount: 12000 + Math.floor(Math.random() * 500),
        type: 'income',
        note: '月度工资',
        date: isoDate(payday),
        time: '09:00',
        categoryId: salaryCat.id,
        accountId: liquidAccounts[0].id
      })
    }

    if (monthsAgo % 2 === 0) {
      const extraCat = incomeCats.find(c => c.name === '兼职') ?? incomeCats[0]
      if (extraCat) {
        const day = new Date(monthStart.getFullYear(), monthStart.getMonth(), 5 + Math.floor(Math.random() * 15))
        batch.push({
          amount: 800 + Math.floor(Math.random() * 1200),
          type: 'income',
          note: '兼职报酬',
          date: isoDate(day),
          time: pickTime(),
          categoryId: extraCat.id,
          accountId: liquidAccounts[Math.floor(Math.random() * liquidAccounts.length)].id
        })
      }
    }

    const expenseCount = 22 + Math.floor(Math.random() * 9)
    const pool = leafCats.length > 0 ? leafCats : fallbackExpense
    for (let i = 0; i < expenseCount; i++) {
      const cat = pool[Math.floor(Math.random() * pool.length)]
      const acc = liquidAccounts[Math.floor(Math.random() * liquidAccounts.length)]
      const day = 1 + Math.floor(Math.random() * daysInMonth)
      const d = new Date(monthStart.getFullYear(), monthStart.getMonth(), day)
      const amount = pickAmount(cat.name)
      const vendor = cat.name === '打车' ? vendors[Math.floor(Math.random() * vendors.length)] : undefined
      batch.push({
        amount,
        type: 'expense',
        note: '',
        date: isoDate(d),
        time: pickTime(),
        categoryId: cat.id,
        accountId: acc.id,
        vendor
      })
    }
  }

  for (const t of batch) {
    await transactionsApi.create(t)
  }
}

function pickAmount(catName: string): number {
  const ranges: Record<string, [number, number]> = {
    '早餐': [5, 25],
    '午餐': [15, 50],
    '晚餐': [15, 80],
    '聚餐AA': [50, 200],
    '聚餐请客': [200, 800],
    '地铁': [3, 12],
    '公交': [1, 5],
    '打车': [10, 80],
    '京东': [50, 500],
    '淘宝': [30, 400],
    '拼多多': [10, 100],
    '抖音': [10, 200],
    '租金': [1500, 4000],
    '水电': [50, 300],
    '物业': [100, 500],
    '游戏': [10, 200],
    '影视': [15, 80],
    '音乐': [8, 30],
    '健身': [50, 300],
    '网盘': [10, 100],
    '挂号': [10, 100],
    '药品': [10, 200],
    '体检': [100, 500],
    '培训': [200, 2000],
    '书籍': [30, 200],
    '课程': [50, 500]
  }
  const r = ranges[catName] ?? [10, 100]
  return Math.floor(r[0] + Math.random() * (r[1] - r[0]) + 0.5) + Math.floor(Math.random() * 100) / 100
}
