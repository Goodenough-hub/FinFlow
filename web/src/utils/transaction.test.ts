import { describe, it, expect } from 'vitest'
import type { Transaction } from '../db/models'
import { compareTransactionsByDateTimeDesc } from './transaction'

function makeTx(id: string, overrides: Partial<Transaction> = {}): Transaction {
  return {
    id,
    amount: 10,
    type: 'expense',
    note: '',
    date: '2026-07-01',
    createdAt: '2026-07-01T00:00:00.000Z',
    ...overrides,
  }
}

function order(txs: Transaction[]): string[] {
  return txs.slice().sort(compareTransactionsByDateTimeDesc).map(t => t.id)
}

describe('compareTransactionsByDateTimeDesc', () => {
  it('按日期降序', () => {
    const a = makeTx('a', { date: '2026-07-03' })
    const b = makeTx('b', { date: '2026-07-01' })
    const c = makeTx('c', { date: '2026-07-02' })
    expect(order([a, b, c])).toEqual(['a', 'c', 'b'])
  })

  it('同日内按时间降序', () => {
    const a = makeTx('a', { date: '2026-07-01', time: '08:00' })
    const b = makeTx('b', { date: '2026-07-01', time: '21:30' })
    const c = makeTx('c', { date: '2026-07-01', time: '12:00' })
    expect(order([a, b, c])).toEqual(['b', 'c', 'a'])
  })

  it('缺失时间视为最早，同日内排最后', () => {
    const timed = makeTx('timed', { date: '2026-07-01', time: '06:00' })
    const noTime = makeTx('notime', { date: '2026-07-01' })
    expect(order([noTime, timed])).toEqual(['timed', 'notime'])
  })

  it('日期优先于时间：晚日低时仍排在早日高时之前', () => {
    const laterDayLowTime = makeTx('ld', { date: '2026-07-02', time: '06:00' })
    const earlierDayHighTime = makeTx('ed', { date: '2026-07-01', time: '23:00' })
    expect(order([earlierDayHighTime, laterDayLowTime])).toEqual(['ld', 'ed'])
  })

  it('日期与时间完全相同时按 createdAt 降序兜底', () => {
    const a = makeTx('a', { date: '2026-07-01', time: '10:00', createdAt: '2026-07-01T09:00:00.000Z' })
    const b = makeTx('b', { date: '2026-07-01', time: '10:00', createdAt: '2026-07-01T10:00:00.000Z' })
    expect(order([a, b])).toEqual(['b', 'a'])
  })

  it('不按 createdAt 做主排序：早日即使更晚创建也排在前', () => {
    const earlierCreated = makeTx('ec', { date: '2026-07-02', time: '10:00', createdAt: '2026-07-02T01:00:00.000Z' })
    const laterCreated = makeTx('lc', { date: '2026-07-01', time: '10:00', createdAt: '2026-07-03T01:00:00.000Z' })
    // 7-02 应排在 7-01 之前，尽管 lc 的 createdAt 更晚
    expect(order([laterCreated, earlierCreated])).toEqual(['ec', 'lc'])
  })
})
