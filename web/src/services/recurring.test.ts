import { describe, it, expect } from 'vitest'
import { computeNextDate } from './recurring'
import type { RecurringTransaction } from '../db/models'

type Rule = Pick<RecurringTransaction, 'frequency' | 'interval' | 'dayOfMonth' | 'dayOfWeek'>

describe('recurring service', () => {
  describe('computeNextDate - monthly', () => {
    it('开始日期就是 dayOfMonth 当月生效', () => {
      const rule: Rule = { frequency: 'monthly', interval: 1, dayOfMonth: 15 }
      const start = '2026-06-10'
      const now = new Date(2026, 5, 1)
      expect(computeNextDate(start, rule, now)).toBe('2026-06-15')
    })

    it('开始日期已过 dayOfMonth，下月生效', () => {
      const rule: Rule = { frequency: 'monthly', interval: 1, dayOfMonth: 15 }
      const start = '2026-06-20'
      const now = new Date(2026, 5, 20)
      expect(computeNextDate(start, rule, now)).toBe('2026-07-15')
    })

    it('跨年', () => {
      const rule: Rule = { frequency: 'monthly', interval: 1, dayOfMonth: 15 }
      const start = '2026-12-20'
      const now = new Date(2026, 11, 20)
      expect(computeNextDate(start, rule, now)).toBe('2027-01-15')
    })

    it('interval=2 表示每两月', () => {
      const rule: Rule = { frequency: 'monthly', interval: 2, dayOfMonth: 15 }
      const start = '2026-06-15'
      const now = new Date(2026, 6, 1)
      expect(computeNextDate(start, rule, now)).toBe('2026-08-15')
    })

    it('dayOfMonth 超过月末则取月末', () => {
      const rule: Rule = { frequency: 'monthly', interval: 1, dayOfMonth: 31 }
      const start = '2026-02-01'
      const now = new Date(2026, 1, 1)
      expect(computeNextDate(start, rule, now)).toBe('2026-02-28')
    })
  })

  describe('computeNextDate - weekly', () => {
    it('本周未到目标日则本周', () => {
      const rule: Rule = { frequency: 'weekly', interval: 1, dayOfWeek: 3 }
      const start = '2026-06-15'
      const now = new Date(2026, 5, 15)
      expect(computeNextDate(start, rule, now)).toBe('2026-06-16')
    })

    it('本周已过目标日则下周', () => {
      const rule: Rule = { frequency: 'weekly', interval: 1, dayOfWeek: 1 }
      const start = '2026-06-18'
      const now = new Date(2026, 5, 18)
      expect(computeNextDate(start, rule, now)).toBe('2026-06-21')
    })

    it('interval=2 表示每两周', () => {
      const rule: Rule = { frequency: 'weekly', interval: 2, dayOfWeek: 3 }
      const start = '2026-06-15'
      const now = new Date(2026, 5, 23)
      expect(computeNextDate(start, rule, now)).toBe('2026-06-30')
    })
  })

  describe('computeNextDate - daily', () => {
    it('开始日即今天，当日生效', () => {
      const rule: Rule = { frequency: 'daily', interval: 1 }
      const start = '2026-06-15'
      const now = new Date(2026, 5, 15)
      expect(computeNextDate(start, rule, now)).toBe('2026-06-15')
    })

    it('interval=3 当日生效', () => {
      const rule: Rule = { frequency: 'daily', interval: 3 }
      const start = '2026-06-15'
      const now = new Date(2026, 5, 15)
      expect(computeNextDate(start, rule, now)).toBe('2026-06-15')
    })

    it('开始日期在今天之后，返回首日', () => {
      const rule: Rule = { frequency: 'daily', interval: 1 }
      const start = '2026-06-20'
      const now = new Date(2026, 5, 15)
      expect(computeNextDate(start, rule, now)).toBe('2026-06-20')
    })
  })

  describe('computeNextDate - yearly', () => {
    it('今年开始日期未到', () => {
      const rule: Rule = { frequency: 'yearly', interval: 1 }
      const start = '2026-12-25'
      const now = new Date(2026, 5, 1)
      expect(computeNextDate(start, rule, now)).toBe('2026-12-25')
    })

    it('开始日期已过则明年', () => {
      const rule: Rule = { frequency: 'yearly', interval: 1 }
      const start = '2026-01-01'
      const now = new Date(2026, 5, 1)
      expect(computeNextDate(start, rule, now)).toBe('2027-01-01')
    })
  })

  describe('computeNextDate - 边界', () => {
    it('now 与 nextDate 同一天时返回当天', () => {
      const rule: Rule = { frequency: 'monthly', interval: 1, dayOfMonth: 15 }
      const start = '2026-06-15'
      const now = new Date(2026, 5, 15)
      expect(computeNextDate(start, rule, now)).toBe('2026-06-15')
    })

    it('now 时间部分被清零', () => {
      const rule: Rule = { frequency: 'daily', interval: 1 }
      const start = '2026-06-15'
      const now = new Date(2026, 5, 16, 23, 59, 59)
      expect(computeNextDate(start, rule, now)).toBe('2026-06-16')
    })
  })
})
