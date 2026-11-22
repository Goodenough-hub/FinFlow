import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

function memoryStorage() {
  const map = new Map<string, string>()
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => { map.set(k, v) },
    removeItem: (k: string) => { map.delete(k) }
  }
}

// 模块加载时读取持久化值；每次重新 import 模拟一次页面重新打开
async function loadStore() {
  vi.resetModules()
  return import('./amountVisibility')
}

describe('amountVisibility', () => {
  beforeEach(() => vi.stubGlobal('localStorage', memoryStorage()))
  afterEach(() => vi.unstubAllGlobals())

  it('从未设置时默认显示金额', async () => {
    const store = await loadStore()
    expect(store.getHideAmount()).toBe(false)
  })

  it('回归：隐藏后重新打开页面仍为隐藏', async () => {
    ;(await loadStore()).setHideAmount(true)
    expect((await loadStore()).getHideAmount()).toBe(true)
  })

  it('再次切回显示后重新打开为显示', async () => {
    const store = await loadStore()
    store.setHideAmount(true)
    store.setHideAmount(false)
    expect((await loadStore()).getHideAmount()).toBe(false)
  })

  it('切换时通知所有订阅者（资产页与我的页同步），取消订阅后不再通知', async () => {
    const store = await loadStore()
    const a = vi.fn()
    const b = vi.fn()
    const unsubA = store.subscribeHideAmount(a)
    store.subscribeHideAmount(b)
    store.setHideAmount(true)
    expect(a).toHaveBeenCalledTimes(1)
    expect(b).toHaveBeenCalledTimes(1)
    unsubA()
    store.setHideAmount(false)
    expect(a).toHaveBeenCalledTimes(1)
    expect(b).toHaveBeenCalledTimes(2)
  })

  it('存储不可用时不抛错，当前会话内仍可切换', async () => {
    vi.stubGlobal('localStorage', {
      getItem: () => { throw new Error('SecurityError') },
      setItem: () => { throw new Error('QuotaExceededError') },
      removeItem: () => { throw new Error('SecurityError') }
    })
    const store = await loadStore()
    expect(store.getHideAmount()).toBe(false)
    expect(() => store.setHideAmount(true)).not.toThrow()
    expect(store.getHideAmount()).toBe(true)
  })
})
