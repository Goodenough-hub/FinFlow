// @vitest-environment jsdom
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest'
import { act, render, screen, fireEvent, cleanup } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { Home, Receipt, Wallet, User } from 'lucide-react'
import GlassTabBar, { HOLD_MS, type TabDef } from './GlassTabBar'

const tabs: TabDef[] = [
  { to: '/', label: '首页', icon: Home },
  { to: '/transactions', label: '账单', icon: Receipt },
  { to: '/accounts', label: '资产', icon: Wallet },
  { to: '/settings', label: '我的', icon: User }
]

// jsdom 没有 PointerEvent，fireEvent.pointer* 会退化成不带 clientX 的 Event
beforeAll(() => {
  if (!('PointerEvent' in window)) {
    class PointerEventPolyfill extends MouseEvent {
      pointerId: number
      pointerType: string
      constructor(type: string, init: PointerEventInit = {}) {
        super(type, init)
        this.pointerId = init.pointerId ?? 1
        this.pointerType = init.pointerType ?? 'touch'
      }
    }
    Object.assign(window, { PointerEvent: PointerEventPolyfill })
  }
})

function Pathname() {
  return <div data-testid="path">{useLocation().pathname}</div>
}

// 底栏宽 400：四个 Tab 依次占 0-100/100-200/200-300/300-400
function renderBar(initial = '/') {
  render(
    <MemoryRouter initialEntries={[initial]}>
      <GlassTabBar tabs={tabs} />
      <Pathname />
    </MemoryRouter>
  )
  const nav = screen.getByRole('navigation')
  nav.getBoundingClientRect = () => ({ left: 0, top: 0, width: 400, height: 64, right: 400, bottom: 64, x: 0, y: 0, toJSON: () => ({}) })
  return nav
}

const path = () => screen.getByTestId('path').textContent
const lens = () => screen.queryByTestId('tab-lens')
// 透镜里有同名的放大副本（非链接），按 link 角色取真正的 Tab
const link = (name: string) => screen.getByRole('link', { name })

describe('GlassTabBar', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('轻点照常切换 Tab，不出透镜', () => {
    renderBar()
    const target = link('资产')
    fireEvent.pointerDown(target, { clientX: 250 })
    fireEvent.pointerUp(target, { clientX: 250 })
    fireEvent.click(target)
    expect(lens()).toBeNull()
    expect(path()).toBe('/accounts')
  })

  it('按住出透镜，拖到第三个 Tab 松手切过去，补发的 click 不再跳转', () => {
    renderBar()
    const start = link('首页')
    fireEvent.pointerDown(start, { clientX: 50 })
    act(() => { vi.advanceTimersByTime(HOLD_MS) })
    expect(lens()).not.toBeNull()

    fireEvent.pointerMove(start, { clientX: 240 })
    fireEvent.pointerUp(start, { clientX: 240 })
    expect(path()).toBe('/accounts')

    // 浏览器松手补发的 click 可能落在别的 Tab 上
    fireEvent.click(link('我的'))
    expect(path()).toBe('/accounts')
  })

  it('横向滑过 8px 立即出透镜，不必等长按', () => {
    renderBar()
    const start = link('首页')
    fireEvent.pointerDown(start, { clientX: 50 })
    fireEvent.pointerMove(start, { clientX: 55 })
    expect(lens()).toBeNull()
    fireEvent.pointerMove(start, { clientX: 70 })
    expect(lens()).not.toBeNull()
  })

  it('滑出底栏右端松手，停在最后一个 Tab', () => {
    renderBar()
    const start = link('首页')
    fireEvent.pointerDown(start, { clientX: 50 })
    fireEvent.pointerMove(start, { clientX: 520 })
    fireEvent.pointerUp(start, { clientX: 520 })
    expect(path()).toBe('/settings')
  })

  it('松手后透镜吸附并在动画结束后收起', () => {
    renderBar()
    const start = link('首页')
    fireEvent.pointerDown(start, { clientX: 50 })
    fireEvent.pointerMove(start, { clientX: 150 })
    fireEvent.pointerUp(start, { clientX: 150 })
    expect(lens()!.className).toContain('settling')
    act(() => { vi.advanceTimersByTime(400) })
    expect(lens()).toBeNull()
  })

  it('手势被系统取消时收起透镜且不切换', () => {
    renderBar()
    const start = link('首页')
    fireEvent.pointerDown(start, { clientX: 50 })
    fireEvent.pointerMove(start, { clientX: 250 })
    fireEvent.pointerCancel(start, { clientX: 250 })
    expect(lens()).toBeNull()
    expect(path()).toBe('/')
  })

  it('拖动结束后下一次轻点不受影响', () => {
    renderBar()
    const start = link('首页')
    fireEvent.pointerDown(start, { clientX: 50 })
    fireEvent.pointerMove(start, { clientX: 150 })
    fireEvent.pointerUp(start, { clientX: 150 }) // 未补发 click
    expect(path()).toBe('/transactions')

    const target = link('资产')
    fireEvent.pointerDown(target, { clientX: 250 })
    fireEvent.pointerUp(target, { clientX: 250 })
    fireEvent.click(target)
    expect(path()).toBe('/accounts')
  })
})
