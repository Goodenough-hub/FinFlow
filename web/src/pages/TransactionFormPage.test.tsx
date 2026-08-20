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
const amountInput = () => document.querySelector('.amount-input') as HTMLInputElement

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
