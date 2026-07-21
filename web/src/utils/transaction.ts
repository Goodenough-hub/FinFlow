import type { Transaction } from '../db/models'

/**
 * 按用户输入的日期（降序）+ 时间（降序）排序，而非按创建时间。
 *
 * - 日期 `date`（必填，ISO yyyy-MM-dd）为主键，降序。
 * - 时间 `time`（可选，HH:MM）为次键，降序；缺失视为最早（同日内排在最后）。
 * - 仅当日期与时间都完全相同时，才用 `createdAt` 做确定性兜底，
 *   不影响主排序，仅打破真正的并列。
 */
export function compareTransactionsByDateTimeDesc(
  a: Transaction,
  b: Transaction
): number {
  const byDate = b.date.localeCompare(a.date)
  if (byDate !== 0) return byDate
  const byTime = (b.time ?? '').localeCompare(a.time ?? '')
  if (byTime !== 0) return byTime
  return b.createdAt.localeCompare(a.createdAt)
}
