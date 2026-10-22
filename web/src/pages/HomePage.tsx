import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import type { Category, TransactionType } from '../db/models'
import { filterByPeriod, stepPeriod } from '../utils/date'
import type { StatPeriod } from '../utils/date'
import { periodTotals } from '../utils/stats'
import { compareTransactionsByDateTimeDesc } from '../utils/transaction'
import { useQuery } from '../hooks/useQuery'
import { transactionsApi } from '../api/finflow'
import PeriodPicker from '../components/PeriodPicker'
import KpiGrid from '../components/KpiGrid'
import IncomeAllocationBar from '../components/IncomeAllocationBar'
import TrendChart from '../components/TrendChart'
import BudgetOverview from '../components/BudgetOverview'
import CategoryAnalysis from '../components/CategoryAnalysis'
import TransactionRow from '../components/TransactionRow'
import EmptyState from '../components/EmptyState'
import OverspendAlertBanner from '../components/OverspendAlertBanner'
import './HomePage.css'

export default function HomePage() {
  const navigate = useNavigate()
  const [period, setPeriod] = useState<StatPeriod>('month')
  const [date, setDate] = useState<Date>(new Date())
  const [categoryTab, setCategoryTab] = useState<TransactionType>('expense')

  const { data: allTransactions = [] } = useQuery(() => transactionsApi.list(), [])

  const filtered = useMemo(
    () => filterByPeriod(allTransactions, period, date),
    [allTransactions, period, date]
  )

  const totals = useMemo(
    () => periodTotals(allTransactions, period, date),
    [allTransactions, period, date]
  )
  const prevTotals = useMemo(
    () => periodTotals(allTransactions, period, stepPeriod(date, period, -1)),
    [allTransactions, period, date]
  )

  const recent = useMemo(
    () => [...allTransactions].sort(compareTransactionsByDateTimeDesc).slice(0, 5),
    [allTransactions]
  )

  const onCategoryLeafClick = (category: Category) => {
    const params = new URLSearchParams({ categoryId: category.id })
    if (period === 'month') {
      params.set('period', 'month')
      params.set('month', `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`)
    } else {
      params.set('period', 'year')
      params.set('year', String(date.getFullYear()))
    }
    navigate(`/transactions?${params.toString()}`)
  }

  return (
    <div className="page home-page">
      <header className="page-header">
        <h1>FinFlow</h1>
        <button className="header-icon" onClick={() => navigate('/search')} aria-label="搜索"><Search size={20} strokeWidth={2} /></button>
      </header>

      <PeriodPicker
        period={period}
        date={date}
        onPeriodChange={setPeriod}
        onDateChange={setDate}
      />

      <KpiGrid current={totals} previous={prevTotals} period={period} />

      <IncomeAllocationBar income={totals.income} expense={totals.expense} />

      <OverspendAlertBanner />

      <TrendChart transactions={allTransactions} />

      {filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon="📊"
            title="本周期暂无数据"
            subtitle="记一笔后即可查看统计"
            height={200}
          />
        </div>
      ) : (
        <div className="card category-section">
          <div className="type-tab">
            <button
              className={categoryTab === 'expense' ? 'active' : ''}
              onClick={() => setCategoryTab('expense')}
            >
              支出
            </button>
            <button
              className={categoryTab === 'income' ? 'active' : ''}
              onClick={() => setCategoryTab('income')}
            >
              收入
            </button>
          </div>
          <CategoryAnalysis
            key={categoryTab}
            transactions={filtered}
            type={categoryTab}
            onLeafClick={onCategoryLeafClick}
          />
        </div>
      )}

      <BudgetOverview />

      <section className="recent-section">
        <div className="section-header">
          <span className="section-title">最近记录</span>
          <span className="section-hint">账单 Tab 查看全部</span>
        </div>
        <div className="card recent-card">
          {recent.length === 0 ? (
            <EmptyState
              icon="📋"
              title="还没有记录"
              subtitle="点击右下角 + 记一笔"
              height={140}
            />
          ) : (
            recent.map(t => <TransactionRow key={t.id} transaction={t} />)
          )}
        </div>
      </section>
    </div>
  )
}
