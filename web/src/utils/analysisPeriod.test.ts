import { describe, expect, it } from 'vitest'
import { analysisPeriodParams, readAnalysisPeriod } from './analysisPeriod'

describe('统计周期链接', () => {
  it('月份往返保留年份和月份，不受时区日期转换影响', () => {
    const params = analysisPeriodParams('month', new Date(2026, 8, 30))
    const { period, date } = readAnalysisPeriod(params)
    expect(period).toBe('month')
    expect(date.getFullYear()).toBe(2026)
    expect(date.getMonth()).toBe(8)
  })

  it('年度链接只筛选对应年份', () => {
    const params = analysisPeriodParams('year', new Date(2025, 7, 12))
    expect(params.toString()).toBe('period=year&year=2025')
    const { period, date } = readAnalysisPeriod(params)
    expect(period).toBe('year')
    expect(date.getFullYear()).toBe(2025)
  })

  it.each(['', 'period=month&month=2026-13', 'period=month&month=xxx', 'period=year&year=0099', 'period=year&year=2026junk'])(
    '缺失或非法周期参数安全回落到当前日期：%s', query => {
      const now = new Date(2026, 9, 29)
      expect(readAnalysisPeriod(new URLSearchParams(query), now).date).toEqual(now)
    }
  )
})
