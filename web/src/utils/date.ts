export type StatPeriod = 'month' | 'year'

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

export function startOfYear(d: Date): Date {
  return new Date(d.getFullYear(), 0, 1)
}

export function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()
}

export function isSameYear(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear()
}

export function daysInMonth(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
}

export function monthYearString(d: Date): string {
  return `${d.getFullYear()}年${d.getMonth() + 1}月`
}

export function yearString(d: Date): string {
  return `${d.getFullYear()}年`
}

export function stepPeriod(d: Date, period: StatPeriod, delta: number): Date {
  if (period === 'month') {
    return new Date(d.getFullYear(), d.getMonth() + delta, 1)
  }
  return new Date(d.getFullYear() + delta, 0, 1)
}

export function isCurrent(d: Date, period: StatPeriod, now = new Date()): boolean {
  return period === 'month' ? isSameMonth(d, now) : isSameYear(d, now)
}

export function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parseISODate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function dayKey(s: string): number {
  return parseInt(s.split('-')[2], 10)
}

export function monthKey(s: string): number {
  return parseInt(s.split('-')[1], 10)
}

export function filterByPeriod<T extends { date: string }>(transactions: T[], period: StatPeriod, ref: Date): T[] {
  if (period === 'month') {
    const y = ref.getFullYear()
    const m = ref.getMonth() + 1
    return transactions.filter(t => {
      const [ty, tm] = t.date.split('-').map(Number)
      return ty === y && tm === m
    })
  }
  const y = ref.getFullYear()
  return transactions.filter(t => parseInt(t.date.split('-')[0], 10) === y)
}
