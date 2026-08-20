// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { Account } from '../db/models'
import SettingsPage from './SettingsPage'

// 回归：我的页账户行必须用 <AccountIcon> 渲染 SVG 图标，与资产页同源；
// 不应再用 account-dot 直接显示 a.icon 字符串（否则两页图标不一致）。

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
  icon: '💰',
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

describe('我的页账户图标与资产页同源', () => {
  beforeEach(() => cleanup())

  it('账户行渲染 AccountIcon 的 SVG，而非 a.icon 文字', () => {
    const { container } = renderPage()
    const img = container.querySelector<HTMLImageElement>(
      'img[src="/icons/accounts/alipay.svg"]'
    )
    expect(img).not.toBeNull()
    // a.icon 字符串（💰）不应作为文本出现在账户图标位
    expect(container.querySelector('.account-dot')).toBeNull()
  })
})
