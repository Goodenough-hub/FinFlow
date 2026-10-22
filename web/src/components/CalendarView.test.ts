// @vitest-environment jsdom
import { createElement } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useParams } from 'react-router-dom'
import type { Transaction } from '../db/models'
import { DailyTransactionSheet } from './CalendarView'

vi.mock('../hooks/useLookup', () => ({
  useCategories: () => ({ byId: new Map() }),
  useAccounts: () => ({ byId: new Map() }),
}))

afterEach(cleanup)

function transaction(index: number): Transaction {
  return {
    id: `tx-${index}`, amount: 10, type: 'expense', note: `流水${index}`,
    date: '2026-10-15', createdAt: new Date(2026, 9, 15, 0, index).toISOString(),
  }
}

function renderSheet(transactions: Transaction[] = []) {
  const onClose = vi.fn()
  function Detail() {
    return createElement('div', null, `交易详情 ${useParams().id}`)
  }
  const result = render(createElement(MemoryRouter, null,
    createElement(Routes, null,
      createElement(Route, {
        path: '/', element: createElement(DailyTransactionSheet, {
          date: new Date(2026, 9, 15), transactions, onClose,
        }),
      }),
      createElement(Route, { path: '/transactions/:id', element: createElement(Detail) }),
    ),
  ))
  return { ...result, onClose }
}

describe('日历每日流水弹层', () => {
  it('无流水时显示日期、空态和零笔汇总', () => {
    const { container } = renderSheet()
    expect(screen.getByRole('dialog', { name: '10月15日 流水' })).toBeTruthy()
    expect(screen.getByText('该日无交易')).toBeTruthy()
    expect(container.querySelector('.day-summary-cell:last-child')?.textContent).toBe('笔数0')
  })

  it('百笔流水完整显示并按时间倒序，不修改传入数组', () => {
    const transactions = Array.from({ length: 100 }, (_, i) => transaction(i))
    const { container } = renderSheet(transactions)
    const rows = container.querySelectorAll('.day-sheet-row')
    expect(rows).toHaveLength(100)
    expect(rows[0].textContent).toContain('流水99')
    expect(rows[99].textContent).toContain('流水0')
    expect(transactions[0].id).toBe('tx-0')
    expect(container.querySelector('.day-summary-cell:last-child')?.textContent).toBe('笔数100')
  })

  it('关闭按钮和遮罩各触发一次关闭，点击内容不会误关', () => {
    const { container, onClose } = renderSheet()
    fireEvent.click(screen.getByText('该日无交易'))
    expect(onClose).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: '关闭' }))
    expect(onClose).toHaveBeenCalledTimes(1)
    fireEvent.click(container.querySelector('.day-sheet-overlay')!)
    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it('点击流水先关闭弹层并跳转到对应交易详情', () => {
    const { onClose } = renderSheet([transaction(1)])
    fireEvent.click(screen.getByText('流水1'))
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(screen.getByText('交易详情 tx-1')).toBeTruthy()
  })
})
