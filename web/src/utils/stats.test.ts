import { describe, it, expect } from 'vitest'
import type { Transaction } from '../db/models'
import { periodTotals, savingsRate, pctChange, aggregateTrend } from './stats'

function tx(partial: Partial<Transaction> & { amount: number; date: string }): Transaction {
  return {
    id: partial.id ?? `t-${partial.date}-${partial.amount}`,
    type: 'expense',
    note: '',
    createdAt: `${partial.date}T00:00:00`,
    ...partial
  }
}

describe('periodTotals', () => {
  it('按月汇总收入与支出', () => {
    const list = [
      tx({ amount: 100, type: 'income', date: '2026-10-01' }),
      tx({ amount: 30, type: 'expense', date: '2026-10-15' }),
      tx({ amount: 999, type: 'income', date: '2026-09-30' })
    ]
    expect(periodTotals(list, 'month', new Date(2026, 9, 15))).toEqual({ income: 100, expense: 30 })
  })

  it('按年汇总', () => {
    const list = [
      tx({ amount: 100, type: 'income', date: '2026-01-01' }),
      tx({ amount: 30, type: 'expense', date: '2026-12-31' }),
      tx({ amount: 999, type: 'income', date: '2025-12-31' })
    ]
    expect(periodTotals(list, 'year', new Date(2026, 9, 15))).toEqual({ income: 100, expense: 30 })
  })

  it('转账不计入收支', () => {
    const list = [tx({ amount: 500, type: 'transfer', date: '2026-10-10' })]
    expect(periodTotals(list, 'month', new Date(2026, 9, 15))).toEqual({ income: 0, expense: 0 })
  })

  it('空数组返回零', () => {
    expect(periodTotals([], 'month', new Date(2026, 9, 15))).toEqual({ income: 0, expense: 0 })
  })
})

describe('savingsRate', () => {
  it('结余率 = (收入 - 支出) / 收入 × 100', () => {
    expect(savingsRate(12000, 8000)).toBeCloseTo(33.33, 2)
  })

  it('支出超过收入时为负', () => {
    expect(savingsRate(8000, 10000)).toBeCloseTo(-25, 2)
  })

  it('收入为零时返回 null（显示 —）', () => {
    expect(savingsRate(0, 500)).toBeNull()
  })

  it('无支出时为 100', () => {
    expect(savingsRate(5000, 0)).toBe(100)
  })
})

describe('pctChange', () => {
  it('计算环比百分比', () => {
    expect(pctChange(12000, 10000)).toBeCloseTo(20, 5)
    expect(pctChange(8000, 10000)).toBeCloseTo(-20, 5)
  })

  it('上期为正、本期为零时为 -100', () => {
    expect(pctChange(0, 1000)).toBe(-100)
  })

  it('上期为零时返回 null（显示 —）', () => {
    expect(pctChange(100, 0)).toBeNull()
    expect(pctChange(0, 0)).toBeNull()
  })
})

describe('aggregateTrend', () => {
  const list = [
    tx({ id: 'a', amount: 1000, type: 'income', date: '2026-10-05' }),
    tx({ id: 'b', amount: 400, type: 'expense', date: '2026-10-20' }),
    tx({ id: 'c', amount: 200, type: 'expense', date: '2026-05-01' }),
    tx({ id: 'd', amount: 999, type: 'transfer', date: '2026-10-11' }),
    tx({ id: 'e', amount: 300, type: 'expense', date: '2026-04-30' })
  ]

  it('month 模式返回近 6 个月（含参照月），按时间升序', () => {
    const buckets = aggregateTrend(list, 'month', new Date(2026, 9, 22))
    expect(buckets.map(b => b.key)).toEqual([
      '2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10'
    ])
    expect(buckets.map(b => b.label)).toEqual(['5月', '6月', '7月', '8月', '9月', '10月'])
    expect(buckets[5]).toMatchObject({ income: 1000, expense: 400 })
    expect(buckets[0]).toMatchObject({ income: 0, expense: 200 })
  })

  it('month 模式跨年', () => {
    const buckets = aggregateTrend([], 'month', new Date(2026, 1, 10))
    expect(buckets.map(b => b.key)).toEqual([
      '2025-09', '2025-10', '2025-11', '2025-12', '2026-01', '2026-02'
    ])
  })

  it('quarter 模式返回近 4 个季度（含参照季度）', () => {
    const buckets = aggregateTrend(list, 'quarter', new Date(2026, 9, 22))
    expect(buckets.map(b => b.key)).toEqual(['2026-Q1', '2026-Q2', '2026-Q3', '2026-Q4'])
    expect(buckets.map(b => b.label)).toEqual(['26Q1', '26Q2', '26Q3', '26Q4'])
    // Q2 含 4-6 月：200 + 300；Q4 含 10 月：400；转账排除
    expect(buckets[1]).toMatchObject({ income: 0, expense: 500 })
    expect(buckets[3]).toMatchObject({ income: 1000, expense: 400 })
  })

  it('quarter 模式跨年', () => {
    const buckets = aggregateTrend([], 'quarter', new Date(2026, 1, 10))
    expect(buckets.map(b => b.key)).toEqual(['2025-Q2', '2025-Q3', '2025-Q4', '2026-Q1'])
  })

  it('year 模式返回近 3 年（含参照年）', () => {
    const buckets = aggregateTrend(list, 'year', new Date(2026, 9, 22))
    expect(buckets.map(b => b.key)).toEqual(['2024', '2025', '2026'])
    expect(buckets.map(b => b.label)).toEqual(['2024年', '2025年', '2026年'])
    expect(buckets[2]).toMatchObject({ income: 1000, expense: 900 })
  })

  it('无数据的桶金额为零，序列完整', () => {
    const buckets = aggregateTrend([], 'month', new Date(2026, 9, 22))
    expect(buckets).toHaveLength(6)
    expect(buckets.every(b => b.income === 0 && b.expense === 0)).toBe(true)
  })
})
