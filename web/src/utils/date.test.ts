import { describe, it, expect } from 'vitest'
import {
  startOfMonth,
  startOfYear,
  isSameMonth,
  isSameYear,
  daysInMonth,
  monthYearString,
  yearString,
  stepPeriod,
  isCurrent,
  toISODate,
  parseISODate,
  dayKey,
  monthKey,
  filterByPeriod
} from './date'

describe('date utils', () => {
  describe('toISODate', () => {
    it('格式化为 YYYY-MM-DD', () => {
      expect(toISODate(new Date(2026, 5, 9))).toBe('2026-06-09')
      expect(toISODate(new Date(2026, 0, 1))).toBe('2026-01-01')
    })

    it('月日补零', () => {
      expect(toISODate(new Date(2026, 2, 5))).toBe('2026-03-05')
    })
  })

  describe('parseISODate', () => {
    it('解析 YYYY-MM-DD', () => {
      const d = parseISODate('2026-06-09')
      expect(d.getFullYear()).toBe(2026)
      expect(d.getMonth()).toBe(5)
      expect(d.getDate()).toBe(9)
    })

    it('与 toISODate 互逆', () => {
      const iso = '2026-12-31'
      expect(toISODate(parseISODate(iso))).toBe(iso)
    })
  })

  describe('startOfMonth / startOfYear', () => {
    it('返回月初', () => {
      const d = startOfMonth(new Date(2026, 5, 15))
      expect(d.getDate()).toBe(1)
      expect(d.getMonth()).toBe(5)
    })

    it('返回年初', () => {
      const d = startOfYear(new Date(2026, 5, 15))
      expect(d.getMonth()).toBe(0)
      expect(d.getDate()).toBe(1)
      expect(d.getFullYear()).toBe(2026)
    })
  })

  describe('isSameMonth / isSameYear', () => {
    it('同年同月', () => {
      expect(isSameMonth(new Date(2026, 5, 1), new Date(2026, 5, 28))).toBe(true)
    })
    it('同年不同月', () => {
      expect(isSameMonth(new Date(2026, 5, 1), new Date(2026, 6, 1))).toBe(false)
    })
    it('同年判断', () => {
      expect(isSameYear(new Date(2026, 0, 1), new Date(2026, 11, 31))).toBe(true)
      expect(isSameYear(new Date(2026, 0, 1), new Date(2027, 0, 1))).toBe(false)
    })
  })

  describe('daysInMonth', () => {
    it('平年二月 28 天', () => {
      expect(daysInMonth(new Date(2026, 1, 1))).toBe(28)
    })
    it('闰年二月 29 天', () => {
      expect(daysInMonth(new Date(2024, 1, 1))).toBe(29)
    })
    it('大月 31 天', () => {
      expect(daysInMonth(new Date(2026, 0, 1))).toBe(31)
    })
    it('小月 30 天', () => {
      expect(daysInMonth(new Date(2026, 3, 1))).toBe(30)
    })
  })

  describe('monthYearString / yearString', () => {
    it('中文年月', () => {
      expect(monthYearString(new Date(2026, 5, 1))).toBe('2026年6月')
    })
    it('中文年', () => {
      expect(yearString(new Date(2026, 5, 1))).toBe('2026年')
    })
  })

  describe('stepPeriod', () => {
    it('月度向前/向后', () => {
      const d = new Date(2026, 5, 15)
      expect(stepPeriod(d, 'month', 1).getMonth()).toBe(6)
      expect(stepPeriod(d, 'month', -1).getMonth()).toBe(4)
    })
    it('年度向前/向后', () => {
      const d = new Date(2026, 5, 15)
      expect(stepPeriod(d, 'year', 1).getFullYear()).toBe(2027)
      expect(stepPeriod(d, 'year', -1).getFullYear()).toBe(2025)
    })
  })

  describe('isCurrent', () => {
    it('本月判断', () => {
      const now = new Date(2026, 5, 15)
      expect(isCurrent(new Date(2026, 5, 1), 'month', now)).toBe(true)
      expect(isCurrent(new Date(2026, 4, 1), 'month', now)).toBe(false)
    })
    it('本年判断', () => {
      const now = new Date(2026, 5, 15)
      expect(isCurrent(new Date(2026, 0, 1), 'year', now)).toBe(true)
      expect(isCurrent(new Date(2025, 0, 1), 'year', now)).toBe(false)
    })
  })

  describe('dayKey / monthKey', () => {
    it('提取日', () => {
      expect(dayKey('2026-06-09')).toBe(9)
      expect(dayKey('2026-12-31')).toBe(31)
    })
    it('提取月', () => {
      expect(monthKey('2026-06-09')).toBe(6)
      expect(monthKey('2026-12-01')).toBe(12)
    })
  })

  describe('filterByPeriod', () => {
    const txs = [
      { id: '1', date: '2026-06-01', amount: 100 },
      { id: '2', date: '2026-06-15', amount: 200 },
      { id: '3', date: '2026-05-15', amount: 300 },
      { id: '4', date: '2025-06-15', amount: 400 },
      { id: '5', date: '2026-07-01', amount: 500 }
    ]

    it('按月过滤', () => {
      const ref = new Date(2026, 5, 15)
      const result = filterByPeriod(txs, 'month', ref)
      expect(result.map(t => t.id)).toEqual(['1', '2'])
    })

    it('按年过滤', () => {
      const ref = new Date(2026, 5, 15)
      const result = filterByPeriod(txs, 'year', ref)
      expect(result.map(t => t.id)).toEqual(['1', '2', '3', '5'])
    })

    it('空数组返回空', () => {
      expect(filterByPeriod([], 'month', new Date(2026, 5, 1))).toEqual([])
    })
  })
})
