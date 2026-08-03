import { describe, it, expect, vi, afterEach } from 'vitest'
import { uid } from './uid'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('uid', () => {
  it('正常返回非空字符串', () => {
    expect(typeof uid()).toBe('string')
    expect(uid().length).toBeGreaterThan(0)
  })

  it('crypto.randomUUID 不可用时回退且不抛错（模拟纯 HTTP 非安全上下文）', () => {
    // 纯 HTTP 下 crypto 存在但没有 randomUUID，裸调曾抛 TypeError → 白屏
    vi.stubGlobal('crypto', {})
    expect(() => uid()).not.toThrow()
    expect(uid()).toMatch(/^\d+-[a-z0-9]+$/)
  })

  it('crypto 整体缺失时也不抛错', () => {
    vi.stubGlobal('crypto', undefined)
    expect(() => uid()).not.toThrow()
    expect(uid()).toMatch(/^\d+-[a-z0-9]+$/)
  })
})
