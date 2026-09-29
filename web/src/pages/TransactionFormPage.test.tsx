// @vitest-environment jsdom
import { StrictMode } from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, render, screen, fireEvent, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import TransactionFormPage from './TransactionFormPage'
import { transactionsApi } from '../api/finflow'

vi.mock('../hooks/useLookup', () => ({
  useCategories: () => ({
    byId: new Map(),
    list: [{ id: 'food', name: '餐饮', type: 'expense', icon: '🍜', colorHex: '#ff0000', sortOrder: 0 }],
    loading: false,
  }),
  useAccounts: () => ({ byId: new Map(), list: [], loading: false }),
}))

vi.mock('../api/finflow', () => ({ transactionsApi: { create: vi.fn(), update: vi.fn() } }))

const originalVisualViewport = Object.getOwnPropertyDescriptor(window, 'visualViewport')
const originalShowModal = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'showModal')
const originalClose = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'close')

beforeEach(() => {
  // jsdom 不实现模态层或 inert；这里只模拟生命周期，触摸隔离交给 Playwright。
  Object.defineProperties(HTMLDialogElement.prototype, {
    showModal: { configurable: true, value: vi.fn(function (this: HTMLDialogElement) {
      this.setAttribute('open', '')
      this.querySelector<HTMLElement>('[autofocus]')?.focus()
    }) },
    close: { configurable: true, value: vi.fn(function (this: HTMLDialogElement) {
      this.removeAttribute('open')
      this.dispatchEvent(new Event('close'))
    }) },
  })
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.clearAllMocks()
  for (const [name, descriptor] of [['showModal', originalShowModal], ['close', originalClose]] as const) {
    if (descriptor) Object.defineProperty(HTMLDialogElement.prototype, name, descriptor)
    else Reflect.deleteProperty(HTMLDialogElement.prototype, name)
  }
  if (originalVisualViewport) {
    Object.defineProperty(window, 'visualViewport', originalVisualViewport)
  } else {
    Reflect.deleteProperty(window, 'visualViewport')
  }
})

function renderPage() {
  return render(
    <StrictMode>
      <MemoryRouter>
        <TransactionFormPage />
      </MemoryRouter>
    </StrictMode>
  )
}

const keypadDialog = () => document.querySelector('.amount-keypad-dialog') as HTMLDialogElement
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

describe('TransactionFormPage 模态金额键盘', () => {
  it('进入页面通过 showModal 打开顶层键盘', () => {
    renderPage()
    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalled()
    expect(keypadDialog().open).toBe(true)
    expect(keypadDialog().parentElement).toBe(document.body)
    expect(screen.getByRole('dialog', { name: '输入金额' })).toBe(keypadDialog())
  })

  it('失焦不会关闭键盘，连续输入同步更新金额且不选择分类', () => {
    renderPage()
    fireEvent.blur(amountInput())
    for (const name of ['1', '2', '小数点', '3', '退格', '0']) {
      const key = screen.getByRole('button', { name })
      fireEvent.pointerDown(key)
      fireEvent.pointerUp(key)
      fireEvent.click(key)
    }
    expect(amountInput().value).toBe('12.0')
    expect(screen.getByLabelText('当前金额').textContent).toBe('¥ 12.0')
    expect(document.querySelector('.cat-row.selected')).toBeNull()
    expect(keypadDialog().open).toBe(true)
  })

  it('完成只收起不保存，恢复金额焦点也不会自动重开', () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: '完成' }))
    expect(keypadDialog().open).toBe(false)
    expect(document.activeElement).toBe(amountInput())
    fireEvent.focus(amountInput())
    expect(keypadDialog().open).toBe(false)
    expect(transactionsApi.create).not.toHaveBeenCalled()
    expect(transactionsApi.update).not.toHaveBeenCalled()

    fireEvent.click(amountInput())
    expect(keypadDialog().open).toBe(true)
  })

  it('遮罩等点击结束才关闭，不会同时选中分类', () => {
    renderPage()
    fireEvent.pointerDown(keypadDialog())
    expect(keypadDialog().open).toBe(true)
    fireEvent.pointerUp(keypadDialog())
    fireEvent.click(keypadDialog())
    expect(keypadDialog().open).toBe(false)
    expect(document.querySelector('.cat-row.selected')).toBeNull()

    fireEvent.click(screen.getByText('餐饮'))
    expect(document.querySelector('.cat-row.selected')?.textContent).toContain('餐饮')
  })

  it('从按键滑到遮罩或触摸取消不会误关键盘', () => {
    renderPage()
    fireEvent.pointerDown(screen.getByRole('button', { name: '1' }))
    fireEvent.pointerUp(keypadDialog())
    fireEvent.click(keypadDialog())
    expect(keypadDialog().open).toBe(true)

    fireEvent.pointerDown(keypadDialog())
    fireEvent.pointerCancel(keypadDialog())
    fireEvent.click(keypadDialog())
    expect(keypadDialog().open).toBe(true)
  })

  it('Escape 对应的 cancel 关闭键盘，金额入口支持键盘重开', () => {
    renderPage()
    fireEvent(keypadDialog(), new Event('cancel', { cancelable: true }))
    expect(keypadDialog().open).toBe(false)
    fireEvent.keyDown(amountInput(), { key: 'Enter' })
    expect(keypadDialog().open).toBe(true)

    // StrictMode 的延迟 close 事件不能关掉已经重新打开的模态框。
    fireEvent(keypadDialog(), new Event('close'))
    expect(keypadDialog().open).toBe(true)
  })

  it('收起金额键盘后可以编辑备注和日期，不会弹回数字键盘', () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: '完成' }))
    const note = screen.getByPlaceholderText('可选')
    fireEvent.focusIn(note)
    fireEvent.change(note, { target: { value: '午餐' } })
    fireEvent.focusIn(document.querySelector('input[type="date"]')!)
    expect((note as HTMLTextAreaElement).value).toBe('午餐')
    expect(keypadDialog().open).toBe(false)
  })

  it('离开页面关闭模态层并移除 Portal', () => {
    const { unmount } = renderPage()
    const dialog = keypadDialog()
    unmount()
    expect(dialog.open).toBe(false)
    expect(document.querySelector('.amount-keypad-dialog')).toBeNull()
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
    fireEvent.click(screen.getByRole('button', { name: '完成' }))
    act(() => {
      note.focus()
      visualViewport.resize(420)
    })

    expect(page.style.getPropertyValue('--form-viewport-height')).toBe('420px')
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'center' })

    unmount()
    expect(visualViewport.viewport.removeEventListener).toHaveBeenCalledWith('resize', expect.any(Function))
    expect(visualViewport.viewport.removeEventListener).toHaveBeenCalledWith('scroll', expect.any(Function))
  })
})
