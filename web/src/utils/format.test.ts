import { describe, it, expect } from 'vitest'
import { asCurrency, formatCompact, formatPercent } from './format'

describe('format utils', () => {
  describe('asCurrency', () => {
    it('正数加 ¥ 前缀', () => {
      expect(asCurrency(100)).toBe('¥100')
      expect(asCurrency(1234.5)).toBe('¥1,234.5')
    })

    it('负数加 - 前缀', () => {
      expect(asCurrency(-100)).toBe('-¥100')
      expect(asCurrency(-1234.5)).toBe('-¥1,234.5')
    })

    it('零', () => {
      expect(asCurrency(0)).toBe('¥0')
    })

    it('NaN/Infinity 兜底为 0', () => {
      expect(asCurrency(Number.NaN)).toBe('¥0')
      expect(asCurrency(Number.POSITIVE_INFINITY)).toBe('¥0')
    })

    it('保留最多 2 位小数', () => {
      expect(asCurrency(1.999)).toBe('¥2')
      expect(asCurrency(1.5)).toBe('¥1.5')
      expect(asCurrency(1.25)).toBe('¥1.25')
    })

    it('千分位分隔', () => {
      expect(asCurrency(1234567.89)).toBe('¥1,234,567.89')
    })
  })

  describe('formatCompact', () => {
    it('小于 1000 直接四舍五入', () => {
      expect(formatCompact(0)).toBe('0')
      expect(formatCompact(99)).toBe('99')
      expect(formatCompact(999)).toBe('999')
    })

    it('1000-9999 用 k', () => {
      expect(formatCompact(1500)).toBe('1.5k')
      expect(formatCompact(9999)).toBe('10.0k')
    })

    it('大于 10000 用 w', () => {
      expect(formatCompact(15000)).toBe('1.5w')
      expect(formatCompact(123456)).toBe('12.3w')
    })

    it('负数保留符号', () => {
      expect(formatCompact(-1500)).toBe('-1.5k')
      expect(formatCompact(-15000)).toBe('-1.5w')
    })
  })

  describe('formatPercent', () => {
    it('默认 1 位小数', () => {
      expect(formatPercent(33.333)).toBe('33.3%')
      expect(formatPercent(50)).toBe('50.0%')
    })

    it('自定义小数位', () => {
      expect(formatPercent(33.333, 2)).toBe('33.33%')
      expect(formatPercent(50, 0)).toBe('50%')
    })
  })
})
