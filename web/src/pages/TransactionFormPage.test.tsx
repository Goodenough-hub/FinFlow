// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import TransactionFormPage from './TransactionFormPage'

// Isolate the page from the data layer: empty category/account lists are enough
// to render the form skeleton (this test only cares about keypad visibility).
vi.mock('../hooks/useLookup', () => ({
  useCategories: () => ({ byId: new Map(), list: [], loading: false }),
  useAccounts: () => ({ byId: new Map(), list: [], loading: false }),
}))

const originalVisualViewport = Object.getOwnPropertyDescriptor(window, 'visualViewport')

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  if (originalVisualViewport) {
    Object.defineProperty(window, 'visualViewport', originalVisualViewport)
  } else {
    Reflect.deleteProperty(window, 'visualViewport')
  }
})

function renderPage() {
  return render(
    <MemoryRouter>
      <TransactionFormPage />
    </MemoryRouter>
  )
}

const keypadDock = () => document.querySelector('.form-keypad-dock')
const amountInput = () => document.querySelector('.amount-input') as HTMLInputElement

function mockVisualViewport(height: number) {
  let resizeListener: EventListener | undefined
  const viewport = {
    height,
    addEventListener: vi.fn((type: string, listener: EventListener) => {
      if (type === 'resize') resizeListener = listener
    }),
    removeEventListener: vi.fn(),
  }
  Object.defineProperty(window, 'visualViewport', {
    configurable: true,
    value: viewport,
  })
  return {
    viewport,
    resize(nextHeight: number) {
      viewport.height = nextHeight
      resizeListener?.(new Event('resize'))
    },
  }
}

describe('TransactionFormPage 自定义键盘显隐', () => {
  it('进入页面自动聚焦金额并显示键盘', () => {
    renderPage()
    expect(document.activeElement).toBe(amountInput())
    expect(keypadDock()).toBeTruthy()
  })

  it('金额聚焦显示键盘，失焦收起（键盘不常驻）', () => {
    renderPage()
    fireEvent.blur(amountInput())
    expect(keypadDock()).toBeNull()
    fireEvent.focus(amountInput())
    expect(keypadDock()).toBeTruthy()
    fireEvent.blur(amountInput())
    expect(keypadDock()).toBeNull()
  })

  it('聚焦备注/日期时键盘收起（回归：双键盘叠屏）', () => {
    renderPage()
    fireEvent.blur(amountInput())
    expect(keypadDock()).toBeNull()

    const note = screen.getByPlaceholderText('可选')
    fireEvent.focus(note)
    expect(keypadDock()).toBeNull()

    const date = document.querySelector('input[type="date"]')!
    fireEvent.focus(date)
    expect(keypadDock()).toBeNull()
  })
})

describe('TransactionFormPage 系统键盘适配', () => {
  it('视口缩小时更新页面高度并将聚焦的备注滚入可见区域', () => {
    const visualViewport = mockVisualViewport(800)
    const scrollIntoView = vi.fn()

    const { unmount } = renderPage()
    const page = document.querySelector('.form-page') as HTMLElement
    const note = screen.getByPlaceholderText('可选')
    Object.defineProperty(note, 'scrollIntoView', { value: scrollIntoView })
    expect(page.style.getPropertyValue('--form-viewport-height')).toBe('800px')

    note.focus()
    visualViewport.resize(420)

    expect(page.style.getPropertyValue('--form-viewport-height')).toBe('420px')
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'center' })

    unmount()
    expect(visualViewport.viewport.removeEventListener).toHaveBeenCalledWith('resize', expect.any(Function))
    expect(visualViewport.viewport.removeEventListener).toHaveBeenCalledWith('scroll', expect.any(Function))
  })
})
