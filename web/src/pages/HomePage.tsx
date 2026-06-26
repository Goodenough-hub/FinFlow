import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import type { Transaction, TransactionType } from '../db/models'
import { filterByPeriod } from '../utils/date'
import type { StatPeriod } from '../utils/date'
import PeriodPicker from '../components/PeriodPicker'
import SummaryCard from '../components/SummaryCard'
import BudgetOverview from '../components/BudgetOverview'
import DailyBarChart from '../components/DailyBarChart'
import CategoryAnalysis from '../components/CategoryAnalysis'
import TransactionRow from '../components/TransactionRow'
import EmptyState from '../components/EmptyState'
import OverspendAlertBanner from '../components/OverspendAlertBanner'
import DailyReportList from '../components/DailyReportList'
import './HomePage.css'

export default function HomePage() {
  const navigate = useNavigate()
  const [period, setPeriod] = useState<StatPeriod>('month')
  const [date, setDate] = useState<Date>(new Date())
  const [categoryTab, setCategoryTab] = useState<TransactionType>('expense')

  const allTransactions = useLiveQuery(() => db.transactions.toArray(), [], [] as Transaction[])

  const filtered = useMemo(
    () => filterByPeriod(allTransactions, period, date),
    [allTransactions, period, date]
  )

  const totals = useMemo(() => {
    let income = 0
    let expense = 0
    for (const t of filtered) {
      if (t.type === 'income') income += t.amount
      else if (t.type === 'expense') expense += t.amount
    }
    return { income, expense, balance: income - expense }
  }, [filtered])

  const recent = useMemo(
    () => [...allTransactions].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)).slice(0, 5),
    [allTransactions]
  )

  return (
    <div className="page home-page">
      <header className="page-header">
        <h1>FinFlow</h1>
        <button className="header-icon" onClick={() => navigate('/search')} aria-label="搜索">🔍</button>
      </header>

      <PeriodPicker
        period={period}
        date={date}
        onPeriodChange={setPeriod}
        onDateChange={setDate}
      />

      <SummaryCard income={totals.income} expense={totals.expense} balance={totals.balance} />

      <OverspendAlertBanner />

      <BudgetOverview />

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
        <>
          <DailyBarChart transactions={filtered} period={period} date={date} />

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
            <CategoryAnalysis key={categoryTab} transactions={filtered} type={categoryTab} />
          </div>

          {period === 'month' && <DailyReportList transactions={filtered} />}
        </>
      )}

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
