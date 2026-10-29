import { useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Search } from 'lucide-react'
import type { Category, CategoryType } from '../db/models'
import { filterByPeriod, stepPeriod } from '../utils/date'
import type { StatPeriod } from '../utils/date'
import { periodTotals } from '../utils/stats'
import { compareTransactionsByDateTimeDesc } from '../utils/transaction'
import { useQuery } from '../hooks/useQuery'
import { useCategories } from '../hooks/useLookup'
import { usePageScrollRestoration } from '../hooks/usePageScrollRestoration'
import { analysisPeriodParams, readAnalysisPeriod } from '../utils/analysisPeriod'
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
  const [params, setParams] = useSearchParams()
  const { period, date } = useMemo(() => readAnalysisPeriod(params), [params])
  const categoryTab: CategoryType = params.get('type') === 'income' ? 'income' : 'expense'

  const { data: allTransactions = [], loading } = useQuery(() => transactionsApi.list(), [])
  const { loading: categoriesLoading } = useCategories()
  usePageScrollRestoration(!loading && !categoriesLoading)

  const updateSelection = (nextPeriod: StatPeriod, nextDate: Date, type = categoryTab) => {
    const next = analysisPeriodParams(nextPeriod, nextDate)
    next.set('type', type)
    setParams(next, { replace: true, preventScrollReset: true })
  }

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

  const onCategoryClick = (category: Category) => {
    navigate(`/analysis/categories/${encodeURIComponent(category.id)}?${analysisPeriodParams(period, date)}`, {
      state: { analysisFrom: true }
    })
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
        onPeriodChange={p => updateSelection(p, date)}
        onDateChange={d => updateSelection(period, d)}
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
              onClick={() => updateSelection(period, date, 'expense')}
            >
              支出
            </button>
            <button
              className={categoryTab === 'income' ? 'active' : ''}
              onClick={() => updateSelection(period, date, 'income')}
            >
              收入
            </button>
          </div>
          <CategoryAnalysis
            key={categoryTab}
            transactions={filtered}
            type={categoryTab}
            onCategoryClick={onCategoryClick}
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
