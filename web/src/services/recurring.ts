import { db, uid } from '../db/db'
import type { RecurringTransaction, Transaction } from '../db/models'
import { parseISODate, toISODate } from '../utils/date'

type Rule = Pick<RecurringTransaction, 'frequency' | 'interval' | 'dayOfMonth' | 'dayOfWeek'>

function firstOccurrence(startDate: Date, rule: Rule): Date {
  if (rule.frequency === 'monthly' && rule.dayOfMonth) {
    const d = new Date(startDate)
    if (d.getDate() > rule.dayOfMonth) {
      d.setMonth(d.getMonth() + 1)
    }
    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
    d.setDate(Math.min(rule.dayOfMonth, lastDay))
    return d
  }
  if (rule.frequency === 'weekly' && rule.dayOfWeek != null) {
    const target = (rule.dayOfWeek - 1 + 7) % 7
    const d = new Date(startDate)
    const cur = d.getDay()
    const diff = (target - cur + 7) % 7
    d.setDate(d.getDate() + diff)
    return d
  }
  return new Date(startDate)
}

function advanceDate(date: Date, rule: Rule): Date {
  const d = new Date(date)
  switch (rule.frequency) {
    case 'daily':
      d.setDate(d.getDate() + rule.interval)
      break
    case 'weekly':
      d.setDate(d.getDate() + rule.interval * 7)
      break
    case 'monthly':
      d.setMonth(d.getMonth() + rule.interval)
      if (rule.dayOfMonth) {
        const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
        d.setDate(Math.min(rule.dayOfMonth, lastDay))
      }
      break
    case 'yearly':
      d.setFullYear(d.getFullYear() + rule.interval)
      break
  }
  return d
}

export function computeNextDate(
  startDateStr: string,
  rule: Rule
): string {
  const start = parseISODate(startDateStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  let next = firstOccurrence(start, rule)
  while (next < today) {
    next = advanceDate(next, rule)
  }
  return toISODate(next)
}

export async function processRecurring(now: Date = new Date()): Promise<number> {
  const todayStr = toISODate(now)
  const todayDate = new Date(todayStr)
  const all = await db.recurring.toArray()

  let created = 0
  const updates: Array<Promise<unknown>> = []

  for (const r of all) {
    if (r.isActive === false) continue
    const rule: Rule = {
      frequency: r.frequency,
      interval: r.interval,
      dayOfMonth: r.dayOfMonth,
      dayOfWeek: r.dayOfWeek
    }
    let nextDate = new Date(r.nextDate)
    const endDate = r.endDate ? new Date(r.endDate) : null
    const toCreate: Transaction[] = []

    while (nextDate <= todayDate && (!endDate || nextDate <= endDate)) {
      toCreate.push({
        id: uid(),
        amount: r.amount,
        type: r.type,
        note: r.note,
        date: toISODate(nextDate),
        createdAt: new Date().toISOString(),
        categoryId: r.categoryId,
        accountId: r.accountId,
        toAccountId: r.toAccountId,
        sourceId: r.id,
        sourceType: 'recurring'
      })
      nextDate = advanceDate(nextDate, rule)
      created++
      if (toCreate.length > 365) break
    }

    if (toCreate.length > 0) {
      await db.transactions.bulkAdd(toCreate)
      const nextDateStr = toISODate(nextDate)
      const exceeded = endDate && nextDate > endDate
      if (exceeded) {
        updates.push(db.recurring.delete(r.id))
      } else {
        updates.push(db.recurring.update(r.id, { nextDate: nextDateStr }))
      }
    }
  }

  await Promise.all(updates)
  return created
}
