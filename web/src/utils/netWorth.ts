import type { Transaction } from '../db/models'

export interface NetWorthPoint {
  /** x 轴短标签，如「10月」 */
  label: string
  /** 年月，用于 tooltip 消除跨年歧义，如「2026年10月」 */
  ym: string
  value: number
}

function monthEndDateStr(year: number, monthIndex: number, now: Date): string {
  const isCurrent = year === now.getFullYear() && monthIndex === now.getMonth()
  const day = isCurrent
    ? now.getDate()
    : new Date(year, monthIndex + 1, 0).getDate()
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/**
 * 净资产月末快照。起点取首笔交易所在月（最多回看 maxMonths 个月），
 * 避免把当前期初余额铺到还没开始记账的月份上。
 * 转账在账户之间流转、不改变净资产，故只累计收入与支出。
 */
export function buildNetWorthHistory(
  transactions: Transaction[],
  baseTotal: number,
  now: Date,
  maxMonths = 12
): NetWorthPoint[] {
  if (transactions.length === 0) return []

  let firstDate = transactions[0].date
  for (const t of transactions) {
    if (t.date < firstDate) firstDate = t.date
  }
  const firstYear = Number(firstDate.slice(0, 4))
  const firstMonth = Number(firstDate.slice(5, 7)) - 1
  if (!Number.isFinite(firstYear) || !Number.isFinite(firstMonth)) return []

  const span = (now.getFullYear() - firstYear) * 12 + (now.getMonth() - firstMonth) + 1
  const count = Math.max(1, Math.min(maxMonths, span))

  const sortedTx = transactions
    .filter(t => t.type !== 'transfer')
    .sort((a, b) => a.date.localeCompare(b.date))

  const points: NetWorthPoint[] = []
  let cursor = 0
  let running = baseTotal
  for (let i = count - 1; i >= 0; i--) {
    const m = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const endDateStr = monthEndDateStr(m.getFullYear(), m.getMonth(), now)
    while (cursor < sortedTx.length && sortedTx[cursor].date <= endDateStr) {
      const t = sortedTx[cursor]
      if (t.type === 'income') running += t.amount
      else if (t.type === 'expense') running -= t.amount
      cursor++
    }
    points.push({
      label: `${m.getMonth() + 1}月`,
      ym: `${m.getFullYear()}年${m.getMonth() + 1}月`,
      value: Math.round(running * 100) / 100
    })
  }
  return points
}
