import type { StatPeriod } from './date'

export function analysisPeriodParams(period: StatPeriod, date: Date): URLSearchParams {
  return new URLSearchParams({
    period,
    ...(period === 'year'
      ? { year: String(date.getFullYear()) }
      : { month: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}` })
  })
}

export function readAnalysisPeriod(params: URLSearchParams, now = new Date()): { period: StatPeriod; date: Date } {
  const period = params.get('period') === 'year' ? 'year' : 'month'
  const raw = params.get(period === 'year' ? 'year' : 'month') ?? ''
  const valid = period === 'year' ? /^\d{4}$/.test(raw) : /^\d{4}-(0[1-9]|1[0-2])$/.test(raw)
  const year = Number(raw.slice(0, 4))
  const date = valid && year >= 1000
    ? new Date(year, period === 'year' ? 0 : Number(raw.slice(5)) - 1, 1)
    : now
  return { period, date }
}
