import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { loadHideAmount, saveHideAmount } from './amountVisibility'

function memoryStorage() {
  const map = new Map<string, string>()
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => { map.set(k, v) },
    removeItem: (k: string) => { map.delete(k) }
  }
}

describe('amountVisibility', () => {
  beforeEach(() => vi.stubGlobal('localStorage', memoryStorage()))
  afterEach(() => vi.unstubAllGlobals())

  it('从未设置时默认显示金额', () => {
    expect(loadHideAmount()).toBe(false)
  })

  it('回归：隐藏后重新读取（模拟切页回来重新挂载）仍为隐藏', () => {
    saveHideAmount(true)
    expect(loadHideAmount()).toBe(true)
  })

  it('再次切回显示后读取为显示', () => {
    saveHideAmount(true)
    saveHideAmount(false)
    expect(loadHideAmount()).toBe(false)
  })

  it('存储不可用时不抛错，按显示处理', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => { throw new Error('SecurityError') },
      setItem: () => { throw new Error('QuotaExceededError') },
      removeItem: () => { throw new Error('SecurityError') }
    })
    expect(() => saveHideAmount(true)).not.toThrow()
    expect(loadHideAmount()).toBe(false)
  })
})
