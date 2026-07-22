import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { Transaction } from '../db/models'
import { useQuery } from '../hooks/useQuery'
import { useTrips, useCategories } from '../hooks/useLookup'
import { transactionsApi } from '../api/finflow'
import { asCurrency } from '../utils/format'
import { compareTransactionsByDateTimeDesc } from '../utils/transaction'
import { aggregateTripByGroup, tripDateRangeText } from '../utils/trip'
import CategoryIcon from '../components/CategoryIcon'
import TransactionRow from '../components/TransactionRow'
import EmptyState from '../components/EmptyState'
import './Trips.css'

export default function TripReportPage() {
  const navigate = useNavigate()
  const { id: tripId = '' } = useParams()
  const { byId: tripById } = useTrips()
  const { byId: catById } = useCategories()
  const { data: allTxs = [] } = useQuery(() => transactionsApi.list(), [])

  const trip = tripById.get(tripId)

  const scopedTx = useMemo(
    () => allTxs.filter(t => t.tripId === tripId),
    [allTxs, tripId]
  )

  const totals = useMemo(() => {
    let expense = 0, income = 0
    for (const t of scopedTx) {
      if (t.type === 'expense') expense += t.amount
      else if (t.type === 'income') income += t.amount
    }
    return { expense, income, net: expense - income }
  }, [scopedTx])

  // 支出按「分类组」聚合
  const groupTotals = useMemo(
    () => aggregateTripByGroup(scopedTx, catById),
    [scopedTx, catById]
  )

  const sortedTx = useMemo(
    () => scopedTx.slice().sort(compareTransactionsByDateTimeDesc),
    [scopedTx]
  )

  const budget = trip?.budget ?? 0
  const budgetPct = budget > 0 ? Math.min(100, (totals.expense / budget) * 100) : 0
  const overBudget = budget > 0 && totals.expense > budget

  return (
    <div className="page">
      <header className="page-header">
        <button className="header-icon" onClick={() => navigate('/trips')} aria-label="返回">‹</button>
        <h1>{trip?.name ?? '旅游报告'}</h1>
        <button className="header-icon" onClick={() => navigate(`/trips/${tripId}/spend`)} aria-label="记账">✏️</button>
      </header>

      {/* 概览 */}
      <div className="card trip-hero">
        <div className="trip-hero-head">
          <span className="trip-hero-plane">✈️</span>
          <div className="trip-hero-info">
            <div className="trip-hero-name">{trip?.name}</div>
            <div className="trip-hero-meta">{tripDateRangeText(trip ?? {})}</div>
          </div>
        </div>

        <div className="trip-hero-spend">
          <span className="ths-label">总支出</span>
          <span className="ths-value">{asCurrency(totals.expense)}</span>
        </div>

        <div className="trip-hero-stats">
          <div className="trip-hero-stat">
            <span className="label">总收入</span>
            <span className="value income">{asCurrency(totals.income)}</span>
          </div>
          <div className="trip-hero-stat">
            <span className="label">我实际花费</span>
            <span className="value">{asCurrency(totals.net)}</span>
          </div>
        </div>

        {budget > 0 && (
          <div className="trip-budget">
            <div className="trip-budget-head">
              <span>预算 {asCurrency(budget)}</span>
              <span className={overBudget ? 'over' : ''}>
                {overBudget ? `超支 ${asCurrency(totals.expense - budget)}` : `剩余 ${asCurrency(budget - totals.expense)}`}
              </span>
            </div>
            <div className="trip-bar-track">
              <div
                className="trip-bar-fill"
                style={{ width: `${budgetPct}%`, background: overBudget ? 'var(--overspend-red)' : 'var(--expense-gold)' }}
              />
            </div>
          </div>
        )}
      </div>

      {/* 分类占比（按组） */}
      {groupTotals.length > 0 && (
        <div className="card">
          <div className="trip-section-title" style={{ margin: '0 0 8px' }}>支出分类</div>
          {groupTotals.map(({ group, total }) => {
            const pct = totals.expense > 0 ? (total / totals.expense) * 100 : 0
            return (
              <div key={group.id} className="trip-bar-row">
                <div className="bar-head">
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <CategoryIcon icon={group.icon} color={group.colorHex} size={20} />
                    {group.name}
                  </span>
                  <span>{asCurrency(total)} · {pct.toFixed(0)}%</span>
                </div>
                <div className="trip-bar-track">
                  <div className="trip-bar-fill" style={{ width: `${pct}%`, background: group.colorHex }} />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* 明细 */}
      <div className="card">
        <div className="trip-section-title" style={{ margin: '0 0 8px' }}>明细 · {sortedTx.length}</div>
        {sortedTx.length === 0 ? (
          <EmptyState icon="✈️" title="还没有这笔旅游的记录" subtitle="点右上角 ✏️ 记一笔" height={160} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {sortedTx.map((t: Transaction) => (
              <TransactionRow key={t.id} transaction={t} showDate />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
