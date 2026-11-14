// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, render, screen, fireEvent, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { Transaction } from '../db/models'
import TransactionsPage from './TransactionsPage'
import AppToasts from '../components/AppToasts'
import { transactionsApi } from '../api/finflow'
import { UNDO_DURATION, flushPendingCommits } from '../services/toast'

// 回归：长按删除曾经是「确认框 → 立即调接口」，无撤销。
// 现在应先从列表隐藏，撤销窗口内可恢复，窗口结束才真正删除。

const { reload } = vi.hoisted(() => ({ reload: vi.fn() }))

const today = new Date()
const pad = (n: number) => String(n).padStart(2, '0')
const tx: Transaction = {
  id: 't1',
  amount: 32,
  type: 'expense',
  note: '午餐',
  date: `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`,
  createdAt: ''
}

vi.mock('../hooks/useQuery', () => ({
  useQuery: () => ({ data: [tx], loading: false, error: null, reload })
}))

vi.mock('../hooks/useLookup', () => ({
  useCategories: () => ({ list: [], byId: new Map(), loading: false }),
  useAccounts: () => ({ list: [], byId: new Map(), loading: false })
}))

vi.mock('../hooks/usePWA', () => ({
  usePWA: () => ({ offline: false, needRefresh: false, update: vi.fn(), dismissUpdate: vi.fn() })
}))

vi.mock('../api/finflow', () => ({ transactionsApi: { remove: vi.fn() } }))

beforeEach(() => {
  vi.useFakeTimers()
  vi.mocked(transactionsApi.remove).mockResolvedValue(undefined as never)
})

afterEach(() => {
  // toast store 是模块级单例：收掉上个用例残留的撤销提示，免得串到下个用例
  act(() => flushPendingCommits())
  cleanup()
  vi.useRealTimers()
  vi.clearAllMocks()
})

function renderPage() {
  return render(
    <MemoryRouter>
      <TransactionsPage />
      <AppToasts />
    </MemoryRouter>
  )
}

function holdFor(el: Element, ms: number) {
  fireEvent.touchStart(el)
  act(() => {
    vi.advanceTimersByTime(ms)
  })
}

// 返回 touchend 是否未被 preventDefault（fireEvent 的返回值语义）
function longPress(el: Element) {
  holdFor(el, 700)
  return fireEvent.touchEnd(el)
}

describe('TransactionsPage 长按删除', () => {
  it('长按后立即从列表隐藏，但撤销窗口内不调删除接口', () => {
    renderPage()
    longPress(screen.getByText('午餐').closest('.tx-row-wrap')!)
    expect(screen.queryByText('午餐')).toBeNull()
    expect(screen.getByText('已删除 1 笔交易')).toBeTruthy()
    expect(transactionsApi.remove).not.toHaveBeenCalled()
  })

  it('长按松手时阻止默认行为，免得合成 click 落到顶上来的下一行（回归：误开下一笔详情）', () => {
    renderPage()
    expect(longPress(screen.getByText('午餐').closest('.tx-row-wrap')!)).toBe(false)
  })

  it('按住不足 700ms 松手不删除，也不拦截点击', () => {
    renderPage()
    const row = screen.getByText('午餐').closest('.tx-row-wrap')!
    holdFor(row, 699)
    expect(fireEvent.touchEnd(row)).toBe(true)
    expect(screen.getByText('午餐')).toBeTruthy()
    expect(screen.queryByText('已删除 1 笔交易')).toBeNull()
  })

  it('进度走满后滑动再松手视为取消，不删除', () => {
    renderPage()
    const row = screen.getByText('午餐').closest('.tx-row-wrap')!
    holdFor(row, 700)
    fireEvent.touchMove(row)
    fireEvent.touchEnd(row)
    expect(screen.getByText('午餐')).toBeTruthy()
    expect(screen.queryByText('已删除 1 笔交易')).toBeNull()
  })

  it('点「撤销」后交易回到列表，窗口结束也不会删除', () => {
    renderPage()
    longPress(screen.getByText('午餐').closest('.tx-row-wrap')!)
    fireEvent.click(screen.getByRole('button', { name: '撤销' }))
    expect(screen.getByText('午餐')).toBeTruthy()
    act(() => {
      vi.advanceTimersByTime(UNDO_DURATION)
    })
    expect(transactionsApi.remove).not.toHaveBeenCalled()
  })

  it('撤销窗口结束后调用删除接口并刷新列表', async () => {
    renderPage()
    longPress(screen.getByText('午餐').closest('.tx-row-wrap')!)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(UNDO_DURATION)
    })
    expect(transactionsApi.remove).toHaveBeenCalledWith('t1')
    expect(reload).toHaveBeenCalled()
  })

  it('删除接口失败时交易回到列表并提示错误', async () => {
    vi.mocked(transactionsApi.remove).mockRejectedValue(new Error('网络错误'))
    renderPage()
    longPress(screen.getByText('午餐').closest('.tx-row-wrap')!)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(UNDO_DURATION)
    })
    expect(screen.getByText('午餐')).toBeTruthy()
    expect(screen.getByText('删除失败：网络错误')).toBeTruthy()
  })
})
