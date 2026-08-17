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

afterEach(cleanup)

function renderPage() {
  return render(
    <MemoryRouter>
      <TransactionFormPage />
    </MemoryRouter>
  )
}

const keypadDock = () => document.querySelector('.form-keypad-dock')

describe('TransactionFormPage 自定义键盘显隐', () => {
  it('初始显示数字键盘 dock', () => {
    renderPage()
    expect(keypadDock()).toBeTruthy()
  })

  it('聚焦备注 textarea 时收起数字键盘，失焦后恢复（回归：双键盘叠屏）', () => {
    renderPage()
    const note = screen.getByPlaceholderText('可选')
    fireEvent.focusIn(note)
    expect(keypadDock()).toBeNull()
    expect(document.querySelector('.form-body.keypad-hidden')).toBeTruthy()
    fireEvent.focusOut(note)
    expect(keypadDock()).toBeTruthy()
  })

  it('聚焦日期/时间输入时同样收起键盘', () => {
    renderPage()
    const date = document.querySelector('input[type="date"]')!
    fireEvent.focusIn(date)
    expect(keypadDock()).toBeNull()
    fireEvent.focusOut(date)
    expect(keypadDock()).toBeTruthy()
  })

  it('金额展示框（readOnly）聚焦不收起键盘', () => {
    renderPage()
    const amount = document.querySelector('.amount-input')!
    fireEvent.focusIn(amount)
    expect(keypadDock()).toBeTruthy()
  })
})
