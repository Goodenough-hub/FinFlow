import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// mock apiClient，避免真实网络；可切换 resolve/reject
const post = vi.fn()
vi.mock('./client', () => ({
  apiClient: { post: (...args: unknown[]) => post(...args) }
}))

beforeEach(() => {
  post.mockReset()
  post.mockResolvedValue({ data: {} })
  // node 测试环境无 sessionStorage / document，注入最小实现
  const store = new Map<string, string>()
  ;(globalThis as { sessionStorage?: unknown }).sessionStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
    key: () => null,
    length: 0
  }
  ;(globalThis as { document?: unknown }).document = { title: 'FinFlow' }
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('trackPageview', () => {
  it('crypto.randomUUID 缺失时不抛错（曾导致 useEffect 冒泡 → 白屏的回归用例）', async () => {
    vi.stubGlobal('crypto', {})
    const { trackPageview } = await import('./track')
    expect(() => trackPageview('/transactions')).not.toThrow()
    expect(post).toHaveBeenCalledOnce()
  })

  it('网络请求 reject 时也不抛错', async () => {
    post.mockRejectedValue(new Error('network down'))
    const { trackPageview } = await import('./track')
    expect(() => trackPageview('/')).not.toThrow()
  })

  it('携带正确的埋点字段', async () => {
    const { trackPageview } = await import('./track')
    trackPageview('/accounts', 'MyTitle')
    expect(post).toHaveBeenCalledWith('/analytics/track', expect.objectContaining({
      app: 'finflow',
      eventType: 'pageview',
      path: '/accounts',
      title: 'MyTitle'
    }))
  })
})
