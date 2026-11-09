import { describe, expect, it } from 'vitest'
import type { Transaction } from '../db/models'
import { buildNetWorthHistory } from './netWorth'

function tx(partial: Partial<Transaction> & Pick<Transaction, 'date' | 'type' | 'amount'>): Transaction {
  return {
    id: partial.date + partial.type + partial.amount,
    note: '',
    createdAt: partial.date,
    ...partial
  } as Transaction
}

describe('净资产趋势', () => {
  const now = new Date(2026, 10, 8) // 2026-11-08

  it('没有交易时不出点，曲线整体隐藏', () => {
    expect(buildNetWorthHistory([], 1000, now)).toEqual([])
  })

  it('起点取首笔交易所在月，不把期初余额铺到没记账的月份', () => {
    const points = buildNetWorthHistory(
      [tx({ date: '2026-09-10', type: 'expense', amount: 100 })],
      1000,
      now
    )
    expect(points.map(p => p.label)).toEqual(['9月', '10月', '11月'])
    expect(points.map(p => p.value)).toEqual([900, 900, 900])
  })

  it('交易跨度超过 12 个月时只保留最近 12 个点，更早的交易并入首点', () => {
    const points = buildNetWorthHistory(
      [
        tx({ date: '2024-03-01', type: 'income', amount: 500 }),
        tx({ date: '2026-11-05', type: 'expense', amount: 200 })
      ],
      1000,
      now
    )
    expect(points).toHaveLength(12)
    expect(points[0]).toMatchObject({ label: '12月', ym: '2025年12月', value: 1500 })
    expect(points[11].value).toBe(1300)
  })

  it('逐月累计收入与支出，月末快照与账单一致', () => {
    const points = buildNetWorthHistory(
      [
        tx({ date: '2026-09-30', type: 'income', amount: 1000 }),
        tx({ date: '2026-10-01', type: 'expense', amount: 300 }),
        tx({ date: '2026-10-31', type: 'expense', amount: 200 }),
        tx({ date: '2026-11-08', type: 'income', amount: 50 })
      ],
      0,
      now
    )
    expect(points.map(p => p.value)).toEqual([1000, 500, 550])
  })

  it('转账不改变净资产', () => {
    const points = buildNetWorthHistory(
      [
        tx({ date: '2026-10-05', type: 'transfer', amount: 5000, accountId: '1', toAccountId: '2' }),
        tx({ date: '2026-10-06', type: 'expense', amount: 10 })
      ],
      800,
      now
    )
    expect(points.map(p => p.value)).toEqual([790, 790])
  })

  it('当月只统计到今天，未来日期的账单不计入', () => {
    const points = buildNetWorthHistory(
      [
        tx({ date: '2026-11-01', type: 'expense', amount: 100 }),
        tx({ date: '2026-11-30', type: 'expense', amount: 999 })
      ],
      2000,
      now
    )
    expect(points.map(p => p.value)).toEqual([1900])
  })

  it('跨年窗口的 tooltip 年月不歧义', () => {
    const points = buildNetWorthHistory(
      [tx({ date: '2025-12-20', type: 'income', amount: 100 })],
      0,
      now
    )
    expect(points[0].ym).toBe('2025年12月')
    expect(points[points.length - 1].ym).toBe('2026年11月')
    expect(points.map(p => p.label).filter(l => l === '12月')).toHaveLength(1)
  })
})
