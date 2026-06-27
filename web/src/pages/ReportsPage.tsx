import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router-dom'
import ReactECharts from 'echarts-for-react'
import { db } from '../db/db'
import type { Account, Category, Transaction } from '../db/models'
import { asCurrency, formatCompact } from '../utils/format'
import { yearString, monthYearString } from '../utils/date'
import { chartColors } from '../utils/chartTheme'
import { useTheme } from '../hooks/useTheme'
import './ReportsPage.css'

type ViewMode = 'year' | 'month'

export default function ReportsPage() {
  const navigate = useNavigate()
  const now = new Date()
  const [mode, setMode] = useState<ViewMode>('year')
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())

  const allTransactions = useLiveQuery(() => db.transactions.toArray(), [], [] as Transaction[])
  const allCategories = useLiveQuery(() => db.categories.toArray(), [], [] as Category[])
  const allAccounts = useLiveQuery(() => db.accounts.toArray(), [], [] as Account[])
  const { effective } = useTheme()

  const refDate = useMemo(() => new Date(year, month, 1), [year, month])

  const scopedTx = useMemo(() => {
    if (mode === 'year') {
      return allTransactions.filter(t => parseInt(t.date.split('-')[0], 10) === year)
    }
    return allTransactions.filter(t => {
      const [y, m] = t.date.split('-').map(Number)
      return y === year && m === month + 1
    })
  }, [allTransactions, mode, year, month])

  const totals = useMemo(() => {
    let income = 0
    let expense = 0
    let maxExpense = 0
    let maxExpenseTx: Transaction | undefined
    for (const t of scopedTx) {
      if (t.type === 'income') income += t.amount
      else if (t.type === 'expense') {
        expense += t.amount
        if (t.amount > maxExpense) {
          maxExpense = t.amount
          maxExpenseTx = t
        }
      }
    }
    const balance = income - expense
    const savingsRate = income > 0 ? (balance / income) * 100 : 0
    const days = mode === 'year' ? 365 : new Date(year, month + 1, 0).getDate()
    const avgDaily = expense / days
    return { income, expense, balance, savingsRate, avgDaily, maxExpense, maxExpenseTx }
  }, [scopedTx, mode, year, month])

  const prevScopedTx = useMemo(() => {
    if (mode === 'year') {
      return allTransactions.filter(t => parseInt(t.date.split('-')[0], 10) === year - 1)
    }
    const prev = new Date(year, month - 1, 1)
    return allTransactions.filter(t => {
      const [y, m] = t.date.split('-').map(Number)
      return y === prev.getFullYear() && m === prev.getMonth() + 1
    })
  }, [allTransactions, mode, year, month])

  const prevExpense = useMemo(
    () => prevScopedTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
    [prevScopedTx]
  )
  const expenseChange = totals.expense - prevExpense
  const expenseChangePct = prevExpense > 0 ? (expenseChange / prevExpense) * 100 : 0

  const monthTrendOption = useMemo(() => {
    const c = chartColors()
    const months = Array.from({ length: 12 }, (_, i) => `${i + 1}月`)
    const incomeData = new Array(12).fill(0)
    const expenseData = new Array(12).fill(0)
    for (const t of allTransactions) {
      if (parseInt(t.date.split('-')[0], 10) !== year) continue
      const m = parseInt(t.date.split('-')[1], 10) - 1
      if (t.type === 'income') incomeData[m] += t.amount
      else if (t.type === 'expense') expenseData[m] += t.amount
    }
    return {
      grid: { left: 44, right: 16, top: 24, bottom: 28 },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: c.tooltipBg,
        borderColor: c.tooltipBorder,
        borderWidth: 1,
        textStyle: { color: c.textPrimary, fontSize: 12 },
        formatter: (params: Array<{ axisValue: string; seriesName: string; value: number }>) => {
          const lines = params
            .map(p => `${p.seriesName}: ¥${p.value.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}`)
            .join('<br/>')
          return `${params[0]?.axisValue ?? ''}<br/>${lines}`
        }
      },
      legend: {
        data: ['收入', '支出'],
        top: 0,
        right: 0,
        itemWidth: 8,
        itemHeight: 8,
        icon: 'circle',
        textStyle: { color: c.text, fontSize: 11 }
      },
      xAxis: {
        type: 'category',
        data: months,
        axisLabel: { color: c.textMuted, fontSize: 10 },
        axisLine: { lineStyle: { color: c.tooltipBorder } },
        axisTick: { show: false }
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: c.textMuted, fontSize: 10, formatter: (v: number) => formatCompact(v) },
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: c.grid, type: 'dashed' } }
      },
      series: [
        {
          name: '收入',
          type: 'bar',
          data: incomeData,
          itemStyle: { color: c.income, borderRadius: [3, 3, 0, 0] },
          barWidth: '35%',
          animationDelay: (i: number) => i * 30
        },
        {
          name: '支出',
          type: 'bar',
          data: expenseData,
          itemStyle: { color: c.expense, borderRadius: [3, 3, 0, 0] },
          barWidth: '35%',
          animationDelay: (i: number) => i * 30 + 150
        }
      ]
    }
  }, [allTransactions, year, effective])

  const topCategories = useMemo(() => {
    const map = new Map<string, number>()
    for (const t of scopedTx) {
      if (t.type !== 'expense' || !t.categoryId) continue
      const cat = allCategories.find(c => c.id === t.categoryId)
      if (!cat) continue
      let rootId: string = cat.id
      let root = cat
      while (root.parentId) {
        const parent = allCategories.find(c => c.id === root.parentId)
        if (!parent) break
        root = parent
        rootId = parent.id
      }
      map.set(rootId, (map.get(rootId) ?? 0) + t.amount)
    }
    return Array.from(map.entries())
      .map(([id, amount]) => ({
        category: allCategories.find(c => c.id === id)!,
        amount
      }))
      .filter(r => r.category)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)
  }, [scopedTx, allCategories])

  const recentTrendOption = useMemo(() => {
    const c = chartColors()
    const labels: string[] = []
    const incomeData: number[] = []
    const expenseData: number[] = []
    const baseDate = new Date(year, month, 1)
    for (let i = 5; i >= 0; i--) {
      const d = new Date(baseDate.getFullYear(), baseDate.getMonth() - i, 1)
      const y = d.getFullYear()
      const m = d.getMonth() + 1
      labels.push(`${m}月`)
      let inc = 0
      let exp = 0
      for (const t of allTransactions) {
        const [ty, tm] = t.date.split('-').map(Number)
        if (ty !== y || tm !== m) continue
        if (t.type === 'income') inc += t.amount
        else if (t.type === 'expense') exp += t.amount
      }
      incomeData.push(inc)
      expenseData.push(exp)
    }
    const currentIdx = 5
    return {
      grid: { left: 44, right: 16, top: 28, bottom: 28 },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: c.tooltipBg,
        borderColor: c.tooltipBorder,
        borderWidth: 1,
        textStyle: { color: c.textPrimary, fontSize: 12 },
        formatter: (params: Array<{ axisValue: string; seriesName: string; value: number }>) => {
          const lines = params
            .map(p => `${p.seriesName}: ¥${p.value.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}`)
            .join('<br/>')
          return `${params[0]?.axisValue ?? ''}<br/>${lines}`
        }
      },
      legend: {
        data: ['收入', '支出'],
        top: 0,
        right: 0,
        itemWidth: 8,
        itemHeight: 8,
        icon: 'circle',
        textStyle: { color: c.text, fontSize: 11 }
      },
      xAxis: {
        type: 'category',
        data: labels,
        axisLabel: {
          color: c.textMuted,
          fontSize: 10,
          formatter: (v: string, i: number) => i === currentIdx ? `【${v}】` : v
        },
        axisLine: { lineStyle: { color: c.tooltipBorder } },
        axisTick: { show: false }
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: c.textMuted, fontSize: 10, formatter: (v: number) => formatCompact(v) },
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: c.grid, type: 'dashed' } }
      },
      series: [
        {
          name: '收入',
          type: 'bar',
          data: incomeData.map((v, i) => ({
            value: v,
            itemStyle: i === currentIdx ? { color: c.income } : { color: c.income + '80' }
          })),
          itemStyle: { borderRadius: [3, 3, 0, 0] },
          barWidth: '30%',
          animationDelay: (i: number) => i * 30
        },
        {
          name: '支出',
          type: 'bar',
          data: expenseData.map((v, i) => ({
            value: v,
            itemStyle: i === currentIdx ? { color: c.expense } : { color: c.expense + '80' }
          })),
          itemStyle: { borderRadius: [3, 3, 0, 0] },
          barWidth: '30%',
          animationDelay: (i: number) => i * 30 + 150
        }
      ]
    }
  }, [allTransactions, year, month, effective])

  const accountTrendOption = useMemo(() => {
    const c = chartColors()
    const yearTx = allTransactions.filter(t => parseInt(t.date.split('-')[0], 10) === year)
    const accTxCount = new Map<string, number>()
    for (const t of yearTx) {
      if (!t.accountId) continue
      accTxCount.set(t.accountId, (accTxCount.get(t.accountId) ?? 0) + 1)
    }
    const topAccounts = Array.from(accTxCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([id]) => allAccounts.find(a => a.id === id))
      .filter((a): a is Account => a !== undefined)

    if (topAccounts.length === 0) return null

    const months = Array.from({ length: 12 }, (_, i) => `${i + 1}月`)
    const series = topAccounts.map(acc => {
      const data = new Array(12).fill(0)
      for (const t of yearTx) {
        if (t.accountId !== acc!.id && t.toAccountId !== acc!.id) continue
        const m = parseInt(t.date.split('-')[1], 10) - 1
        if (t.type === 'income') data[m] += t.amount
        else if (t.type === 'expense') data[m] -= t.amount
        else if (t.type === 'transfer') {
          if (t.toAccountId === acc!.id) data[m] += t.amount
          else data[m] -= t.amount
        }
      }
      let cumulative = 0
      const cum = data.map(v => {
        cumulative += v
        return Math.round(cumulative * 100) / 100
      })
      return {
        name: acc!.name,
        type: 'line',
        smooth: true,
        data: cum,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { width: 2.5, color: acc!.colorHex },
        itemStyle: { color: acc!.colorHex },
        animationDelay: (i: number) => i * 40
      }
    })

    return {
      grid: { left: 48, right: 16, top: 28, bottom: 28 },
      tooltip: {
        trigger: 'axis',
        backgroundColor: c.tooltipBg,
        borderColor: c.tooltipBorder,
        borderWidth: 1,
        textStyle: { color: c.textPrimary, fontSize: 12 },
        formatter: (params: Array<{ axisValue: string; seriesName: string; value: number }>) => {
          const lines = params
            .map(p => `${p.seriesName}: ¥${p.value.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}`)
            .join('<br/>')
          return `${params[0]?.axisValue ?? ''}<br/>${lines}`
        }
      },
      legend: {
        data: topAccounts.map(a => a!.name),
        top: 0,
        right: 0,
        itemWidth: 10,
        itemHeight: 2,
        icon: 'roundRect',
        textStyle: { color: c.text, fontSize: 11 }
      },
      xAxis: {
        type: 'category',
        data: months,
        boundaryGap: false,
        axisLabel: { color: c.textMuted, fontSize: 10 },
        axisLine: { lineStyle: { color: c.tooltipBorder } },
        axisTick: { show: false }
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: c.textMuted, fontSize: 10, formatter: (v: number) => formatCompact(v) },
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: c.grid, type: 'dashed' } }
      },
      series
    }
  }, [allTransactions, allAccounts, year, effective])

  const weekdayData = useMemo(() => {
    const data = new Array(7).fill(0)
    for (const t of scopedTx) {
      if (t.type !== 'expense') continue
      const [y, m, d] = t.date.split('-').map(Number)
      const wd = new Date(y, m - 1, d).getDay()
      data[wd] += t.amount
    }
    return data
  }, [scopedTx])

  const weekdayOption = useMemo(() => {
    const c = chartColors()
    return {
      grid: { left: 44, right: 16, top: 16, bottom: 24 },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: c.tooltipBg,
        borderColor: c.tooltipBorder,
        borderWidth: 1,
        textStyle: { color: c.textPrimary, fontSize: 12 },
        formatter: (params: Array<{ axisValue: string; value: number }>) =>
          `${params[0]?.axisValue}<br/>¥${(params[0]?.value ?? 0).toLocaleString('zh-CN', { maximumFractionDigits: 2 })}`
      },
      xAxis: {
        type: 'category',
        data: ['日', '一', '二', '三', '四', '五', '六'],
        axisLabel: { color: c.textMuted, fontSize: 11 },
        axisLine: { lineStyle: { color: c.tooltipBorder } },
        axisTick: { show: false }
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: c.textMuted, fontSize: 10, formatter: (v: number) => formatCompact(v) },
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: c.grid, type: 'dashed' } }
      },
      series: [{
        type: 'bar',
        data: weekdayData,
        itemStyle: {
          color: c.accent,
          borderRadius: [4, 4, 0, 0]
        },
        barWidth: '50%',
        animationDelay: (i: number) => i * 50
      }]
    }
  }, [weekdayData, effective])

  const accountDistribution = useMemo(() => {
    const map = new Map<string, number>()
    for (const t of scopedTx) {
      if (t.type !== 'expense' || !t.accountId) continue
      map.set(t.accountId, (map.get(t.accountId) ?? 0) + t.amount)
    }
    return Array.from(map.entries())
      .map(([id, amount]) => ({
        account: allAccounts.find(a => a.id === id),
        amount
      }))
      .filter(r => r.account)
      .sort((a, b) => b.amount - a.amount)
  }, [scopedTx, allAccounts])

  const maxCat = topCategories[0]
  const maxCatRatio = maxCat && totals.expense > 0 ? maxCat.amount / totals.expense : 0

  const stepYear = (delta: number) => setYear(y => y + delta)
  const stepMonth = (delta: number) => {
    const d = new Date(year, month + delta, 1)
    setMonth(d.getMonth())
    setYear(d.getFullYear())
  }

  return (
    <div className="page reports-page">
      <header className="form-header">
        <button className="form-header-btn" onClick={() => navigate(-1)}>返回</button>
        <span className="form-title">报表中心</span>
        <span className="form-header-spacer" />
      </header>

      <div className="mode-tabs">
        <button className={mode === 'year' ? 'active' : ''} onClick={() => setMode('year')}>年度</button>
        <button className={mode === 'month' ? 'active' : ''} onClick={() => setMode('month')}>月度</button>
      </div>

      <div className="period-nav">
        <button className="period-arrow" onClick={() => mode === 'year' ? stepYear(-1) : stepMonth(-1)}>‹</button>
        <span className="period-text">
          {mode === 'year' ? yearString(refDate) : monthYearString(refDate)}
        </span>
        <button
          className="period-arrow"
          onClick={() => mode === 'year' ? stepYear(1) : stepMonth(1)}
          disabled={mode === 'year' ? year >= now.getFullYear() : year === now.getFullYear() && month >= now.getMonth()}
        >
          ›
        </button>
      </div>

      <section className="stat-tiles">
        <div className="stat-tile">
          <div className="stat-tile-label">总收入</div>
          <div className="stat-tile-value income">{asCurrency(totals.income)}</div>
        </div>
        <div className="stat-tile">
          <div className="stat-tile-label">总支出</div>
          <div className="stat-tile-value expense">{asCurrency(totals.expense)}</div>
        </div>
        <div className="stat-tile">
          <div className="stat-tile-label">结余</div>
          <div className="stat-tile-value balance">{asCurrency(totals.balance)}</div>
        </div>
        <div className="stat-tile">
          <div className="stat-tile-label">储蓄率</div>
          <div className="stat-tile-value">{Math.round(totals.savingsRate)}%</div>
        </div>
      </section>

      <section className="card report-card">
        <div className="report-card-title">
          {mode === 'year' ? '月度收支趋势' : '与上月对比'}
        </div>
        {mode === 'year' ? (
          <ReactECharts
            option={monthTrendOption}
            style={{ height: 220 }}
            opts={{ renderer: 'svg' }}
            notMerge
            lazyUpdate
          />
        ) : (
          <div className="compare-block">
            <div className="compare-row">
              <span className="compare-label">本月支出</span>
              <span className="compare-value">{asCurrency(totals.expense)}</span>
            </div>
            <div className="compare-row">
              <span className="compare-label">上月支出</span>
              <span className="compare-value muted">{asCurrency(prevExpense)}</span>
            </div>
            <div className="compare-row">
              <span className="compare-label">环比变化</span>
              <span
                className="compare-value"
                style={{ color: expenseChange > 0 ? 'var(--overspend-red)' : 'var(--income-green)' }}
              >
                {expenseChange > 0 ? '+' : ''}{asCurrency(expenseChange)}
                {prevExpense > 0 && (
                  <span className="compare-pct">
                    {' '}({expenseChange > 0 ? '+' : ''}{Math.round(expenseChangePct)}%)
                  </span>
                )}
              </span>
            </div>
            <div className="compare-divider" />
            <div className="compare-row">
              <span className="compare-label">日均支出</span>
              <span className="compare-value">{asCurrency(totals.avgDaily)}</span>
            </div>
            <div className="compare-row">
              <span className="compare-label">最大单笔</span>
              <span className="compare-value">{totals.maxExpenseTx ? asCurrency(totals.maxExpense) : '—'}</span>
            </div>
          </div>
        )}
      </section>

      {mode === 'month' && (
        <section className="card report-card">
          <div className="report-card-title">近 6 月收支趋势</div>
          <ReactECharts
            option={recentTrendOption}
            style={{ height: 220 }}
            opts={{ renderer: 'svg' }}
            notMerge
            lazyUpdate
          />
        </section>
      )}

      {mode === 'year' && accountTrendOption && (
        <section className="card report-card">
          <div className="report-card-title">账户余额走势（累计）</div>
          <ReactECharts
            option={accountTrendOption}
            style={{ height: 240 }}
            opts={{ renderer: 'svg' }}
            notMerge
            lazyUpdate
          />
        </section>
      )}

      {topCategories.length > 0 && (
        <section className="card report-card">
          <div className="report-card-title">支出 Top 5 分类</div>
          <div className="topcat-list">
            {topCategories.map(({ category, amount }, idx) => {
              const ratio = totals.expense > 0 ? amount / totals.expense : 0
              return (
                <div key={category.id} className="topcat-row">
                  <span className="topcat-rank">{idx + 1}</span>
                  <span className="topcat-icon" style={{ background: `${category.colorHex}22`, color: category.colorHex }}>
                    {category.icon}
                  </span>
                  <div className="topcat-info">
                    <div className="topcat-top">
                      <span className="topcat-name">{category.name}</span>
                      <span className="topcat-amount">{asCurrency(amount)}</span>
                    </div>
                    <div className="topcat-bar">
                      <div
                        className="topcat-fill"
                        style={{ width: `${ratio * 100}%`, background: category.colorHex }}
                      />
                    </div>
                    <div className="topcat-pct">{Math.round(ratio * 100)}% 占比</div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {mode === 'month' && (
        <section className="card report-card">
          <div className="report-card-title">按星期分布</div>
          <ReactECharts
            option={weekdayOption}
            style={{ height: 200 }}
            opts={{ renderer: 'svg' }}
            notMerge
            lazyUpdate
          />
        </section>
      )}

      {accountDistribution.length > 0 && (
        <section className="card report-card">
          <div className="report-card-title">账户支出分布</div>
          <div className="acct-dist">
            {accountDistribution.map(({ account, amount }) => {
              const ratio = totals.expense > 0 ? amount / totals.expense : 0
              return (
                <div key={account!.id} className="acct-dist-row">
                  <span className="acct-dist-icon" style={{ background: `${account!.colorHex}22`, color: account!.colorHex }}>
                    {account!.icon}
                  </span>
                  <span className="acct-dist-name">{account!.name}</span>
                  <div className="acct-dist-bar">
                    <div
                      className="acct-dist-fill"
                      style={{ width: `${ratio * 100}%`, background: account!.colorHex }}
                    />
                  </div>
                  <span className="acct-dist-amount">{asCurrency(amount)}</span>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {maxCat && (
        <section className="card insight-card">
          <div className="insight-icon">💡</div>
          <div className="insight-text">
            {mode === 'year' ? '本年' : '本月'}最大支出分类为
            <span style={{ color: maxCat.category.colorHex, fontWeight: 600 }}>
              {maxCat.category.name}
            </span>
            ，共 {asCurrency(maxCat.amount)}，占支出 {Math.round(maxCatRatio * 100)}%。
          </div>
        </section>
      )}
    </div>
  )
}
