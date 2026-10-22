import type { Transaction } from '../db/models'
import type { StatPeriod } from './date'
import { filterByPeriod } from './date'

export interface PeriodTotals {
  income: number
  expense: number
}

export type TrendMode = 'month' | 'quarter' | 'year'

export interface TrendBucket {
  key: string
  label: string
  income: number
  expense: number
}

/** 汇总指定周期的收入与支出；转账不计入。 */
export function periodTotals(transactions: Transaction[], period: StatPeriod, ref: Date): PeriodTotals {
  let income = 0
  let expense = 0
  for (const t of filterByPeriod(transactions, period, ref)) {
    if (t.type === 'income') income += t.amount
    else if (t.type === 'expense') expense += t.amount
  }
  return { income, expense }
}

/** 结余率（百分比）。收入为 0 时无意义，返回 null。 */
export function savingsRate(income: number, expense: number): number | null {
  if (income <= 0) return null
  return ((income - expense) / income) * 100
}

/** 环比变化（百分比）。上期为 0 时无意义，返回 null。 */
export function pctChange(current: number, previous: number): number | null {
  if (previous <= 0) return null
  return ((current - previous) / previous) * 100
}

const TREND_LENGTH: Record<TrendMode, number> = { month: 6, quarter: 4, year: 3 }

function bucketKeyOf(date: string, mode: TrendMode): string {
  const [y, m] = date.split('-').map(Number)
  if (mode === 'month') return `${y}-${String(m).padStart(2, '0')}`
  if (mode === 'quarter') return `${y}-Q${Math.ceil(m / 3)}`
  return `${y}`
}

/** 生成以 ref 所在周期结尾的连续趋势桶（月=近6个月，季=近4季度，年=近3年），按时间升序。 */
export function aggregateTrend(transactions: Transaction[], mode: TrendMode, ref: Date): TrendBucket[] {
  const len = TREND_LENGTH[mode]
  const buckets: TrendBucket[] = []
  for (let i = len - 1; i >= 0; i--) {
    if (mode === 'month') {
      const d = new Date(ref.getFullYear(), ref.getMonth() - i, 1)
      const y = d.getFullYear()
      const m = d.getMonth() + 1
      buckets.push({ key: `${y}-${String(m).padStart(2, '0')}`, label: `${m}月`, income: 0, expense: 0 })
    } else if (mode === 'quarter') {
      const total = ref.getFullYear() * 4 + Math.floor(ref.getMonth() / 3) - i
      const y = Math.floor(total / 4)
      const q = (total % 4) + 1
      buckets.push({ key: `${y}-Q${q}`, label: `${String(y).slice(2)}Q${q}`, income: 0, expense: 0 })
    } else {
      const y = ref.getFullYear() - i
      buckets.push({ key: `${y}`, label: `${y}年`, income: 0, expense: 0 })
    }
  }
  const byKey = new Map(buckets.map(b => [b.key, b]))
  for (const t of transactions) {
    if (t.type !== 'income' && t.type !== 'expense') continue
    const bucket = byKey.get(bucketKeyOf(t.date, mode))
    if (!bucket) continue
    if (t.type === 'income') bucket.income += t.amount
    else bucket.expense += t.amount
  }
  return buckets
}
