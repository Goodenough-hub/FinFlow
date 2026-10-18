// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, cleanup, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { Account } from '../db/models'
import SettingsPage from './SettingsPage'

// 回归：我的页账户行用 account-dot 文字圆（与资产页同源），
// 不应回退到 SVG 图标（曾经的方向错误：改用 AccountIcon 渲染 SVG）。

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { username: 'Tester', role: 'user', avatar: '' },
    logout: vi.fn(),
    setAvatar: vi.fn()
  })
}))

vi.mock('../hooks/usePWA', () => ({
  usePWA: () => ({
    offline: false,
    canInstall: false,
    installed: false,
    needRefresh: false,
    install: vi.fn(),
    update: vi.fn(),
    dismissUpdate: vi.fn()
  })
}))

vi.mock('../hooks/useTheme', () => ({
  useTheme: () => ({ mode: 'light', effective: 'light', setThemeMode: vi.fn() })
}))

vi.mock('../hooks/useQuery', () => ({
  useQuery: () => ({ data: [], loading: false, error: null, reload: vi.fn() })
}))

const account: Account = {
  id: 'a1',
  name: '支付宝',
  type: 'alipay',
  icon: '支',
  colorHex: '#1677FF',
  initialBalance: 0,
  sortOrder: 0,
  isSystem: false,
  parentId: undefined,
  createdAt: ''
}

vi.mock('../hooks/useLookup', () => ({
  useAccounts: () => ({ list: [account], byId: new Map([[account.id, account]]), loading: false }),
  useCategories: () => ({ list: [], byId: new Map(), loading: false }),
  refreshAllLookups: vi.fn()
}))

vi.mock('../hooks/useConfirm', () => ({
  useConfirm: () => ({ confirm: vi.fn().mockResolvedValue(true), confirmElement: null })
}))

function renderPage() {
  return render(
    <MemoryRouter>
      <SettingsPage />
    </MemoryRouter>
  )
}

describe('我的页账户图标用 account-dot 文字圆', () => {
  beforeEach(() => cleanup())

  it('账户行渲染 account-dot 文字圆，而非 SVG 图标', () => {
    const { container } = renderPage()
    const dot = container.querySelector('.account-dot')
    expect(dot).not.toBeNull()
    // a.icon 文字应出现在图标位
    expect(dot?.textContent).toContain('支')
    // 不应渲染账户 SVG
    expect(container.querySelector('img[src*="/icons/accounts/"]')).toBeNull()
  })
})

describe('我的页强制刷新能力', () => {
  beforeEach(() => cleanup())

  it('渲染强制刷新按钮并可点击触发清除缓存', async () => {
    const deleteMock = vi.fn().mockResolvedValue(true)
    const keysMock = vi.fn().mockResolvedValue(['cache-v1', 'cache-v2'])
    const replaceMock = vi.fn()

    Object.defineProperty(window, 'caches', {
      configurable: true,
      value: { keys: keysMock, delete: deleteMock }
    })
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, replace: replaceMock }
    })

    const { getByText } = renderPage()
    const refreshBtn = getByText('强制刷新（清除缓存）')
    expect(refreshBtn).not.toBeNull()

    fireEvent.click(refreshBtn)

    expect(keysMock).toHaveBeenCalled()
    await Promise.resolve()
    expect(deleteMock).toHaveBeenCalledWith('cache-v1')
    expect(deleteMock).toHaveBeenCalledWith('cache-v2')
  })
})
