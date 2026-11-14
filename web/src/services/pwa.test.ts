// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { RegisterSWOptions } from 'virtual:pwa-register'
import type * as PwaModule from './pwa'

const { registerSW, updateSW } = vi.hoisted(() => ({
  registerSW: vi.fn(),
  updateSW: vi.fn()
}))
vi.mock('virtual:pwa-register', () => ({ registerSW }))

// pwa.ts 持有模块级单例状态（是否已注册、是否已交互）；每个用例 resetModules 后动态重新加载（静态 import 做不到）。
let pwa: typeof PwaModule
let options: RegisterSWOptions

beforeEach(async () => {
  vi.resetModules()
  registerSW.mockReset().mockImplementation((opts: RegisterSWOptions) => {
    options = opts
    return updateSW
  })
  updateSW.mockReset().mockResolvedValue(undefined)
  pwa = await import('./pwa')
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('initPWA 更新策略', () => {
  it('重复调用只注册一次 Service Worker', () => {
    pwa.initPWA()
    pwa.initPWA()
    expect(registerSW).toHaveBeenCalledTimes(1)
  })

  it('用户还没操作过页面时发现新版本，直接应用并刷新', () => {
    pwa.initPWA()
    options.onNeedRefresh!()
    expect(updateSW).toHaveBeenCalledWith(true)
    expect(pwa.getNeedRefresh()).toBe(false)
  })

  it('用户操作过页面后发现新版本，只亮提示、不自动刷新（回归：曾静默 reload 丢表单）', () => {
    pwa.initPWA()
    window.dispatchEvent(new Event('pointerdown'))
    options.onNeedRefresh!()
    expect(updateSW).not.toHaveBeenCalled()
    expect(pwa.getNeedRefresh()).toBe(true)
  })

  it('点「刷新」后应用新版本并收起提示', async () => {
    pwa.initPWA()
    window.dispatchEvent(new KeyboardEvent('keydown'))
    options.onNeedRefresh!()
    await pwa.applyUpdate()
    expect(updateSW).toHaveBeenCalledWith(true)
    expect(pwa.getNeedRefresh()).toBe(false)
  })

  it('点「稍后」只收起提示，不刷新', () => {
    pwa.initPWA()
    window.dispatchEvent(new Event('pointerdown'))
    options.onNeedRefresh!()
    pwa.dismissUpdate()
    expect(pwa.getNeedRefresh()).toBe(false)
    expect(updateSW).not.toHaveBeenCalled()
  })
})

describe('checkForUpdate', () => {
  const swUrl = '/finflow/sw.js'
  const makeReg = (installing: unknown = null) =>
    ({ installing, update: vi.fn().mockResolvedValue(undefined) }) as unknown as ServiceWorkerRegistration

  it('sw.js 可达（200）时调用 registration.update()', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ status: 200 })
    vi.stubGlobal('fetch', fetchMock)
    const reg = makeReg()
    await pwa.checkForUpdate(swUrl, reg)
    expect(fetchMock).toHaveBeenCalledWith(swUrl, expect.objectContaining({ cache: 'no-store' }))
    expect(reg.update).toHaveBeenCalledTimes(1)
  })

  it('sw.js 返回非 200 时不调用 update()', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 502 }))
    const reg = makeReg()
    await pwa.checkForUpdate(swUrl, reg)
    expect(reg.update).not.toHaveBeenCalled()
  })

  it('网络异常时静默跳过，不向外抛错', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    const reg = makeReg()
    await expect(pwa.checkForUpdate(swUrl, reg)).resolves.toBeUndefined()
    expect(reg.update).not.toHaveBeenCalled()
  })

  it('离线时不发请求', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    await pwa.checkForUpdate(swUrl, makeReg())
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('已有新 SW 在安装中时不重复检查', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    await pwa.checkForUpdate(swUrl, makeReg({}))
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
