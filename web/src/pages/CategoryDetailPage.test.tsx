// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { Category, Transaction } from '../db/models'
import CategoryDetailPage from './CategoryDetailPage'

const { query, categories } = vi.hoisted(() => ({
  query: { data: [] as Transaction[], loading: false, error: null as Error | null, reload: vi.fn() },
  categories: [
    { id: 'food', name: '餐饮', type: 'expense', icon: '🍜', colorHex: '#ff0000', sortOrder: 0, isSystem: false },
    { id: 'lunch', name: '午餐', type: 'expense', parentId: 'food', icon: '🍚', colorHex: '#ff0000', sortOrder: 0, isSystem: false },
    { id: 'salary', name: '工资', type: 'income', icon: '💰', colorHex: '#00ff00', sortOrder: 0, isSystem: false }
  ] as Category[]
}))

vi.mock('../hooks/useQuery', () => ({ useQuery: () => query }))
vi.mock('../hooks/useLookup', () => ({
  useCategories: () => ({ list: categories, byId: new Map(categories.map(c => [c.id, c])), loading: false }),
  useAccounts: () => ({ list: [], byId: new Map(), loading: false })
}))
vi.mock('../hooks/useTheme', () => ({ useTheme: () => ({ effective: 'light' }) }))
vi.mock('echarts-for-react', () => ({ default: () => <div /> }))

afterEach(() => {
  cleanup()
  query.data = []
  query.loading = false
  query.error = null
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

function tx(id: string, categoryId: string, date = '2026-10-15', type: Transaction['type'] = 'expense'): Transaction {
  return { id, categoryId, date, type, amount: 20, note: id, createdAt: `${date}T12:00:00Z` }
}

function renderPage(url = '/analysis/categories/food?period=month&month=2026-10') {
  vi.stubGlobal('matchMedia', () => ({ matches: false }))
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/analysis/categories/:id" element={<CategoryDetailPage />} />
        <Route path="/" element={<div>首页统计</div>} />
        <Route path="/transactions/:id" element={<div>编辑交易</div>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('分类明细', () => {
  it('父分类显示所选周期的直接交易和子分类交易，并能继续查看子分类', () => {
    query.data = [tx('父类记录', 'food'), tx('午餐记录', 'lunch'), tx('上月记录', 'food', '2026-09-01'), tx('错误类型', 'food', '2026-10-15', 'income')]
    renderPage()
    expect(screen.getByText('2026年10月 · 餐饮支出')).toBeTruthy()
    const list = screen.getByRole('region', { name: '交易明细' })
    expect(within(list).getAllByRole('button')).toHaveLength(2)
    expect(within(list).queryByText('上月记录')).toBeNull()
    expect(screen.getByText('直接记入本分类')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /午餐.*20/ }))
    expect(screen.getByText('2026年10月 · 午餐支出')).toBeTruthy()
    expect(screen.getByText('餐饮 / 午餐')).toBeTruthy()
    expect(screen.queryByText('父类记录')).toBeNull()
  })

  it('年度收入汇总包含同年不同月份，排除其他年份', () => {
    query.data = [tx('一月工资', 'salary', '2025-01-01', 'income'), tx('十二月工资', 'salary', '2025-12-01', 'income'), tx('今年工资', 'salary', '2026-01-01', 'income')]
    renderPage('/analysis/categories/salary?period=year&year=2025')
    expect(screen.getByText('2025年 · 工资收入')).toBeTruthy()
    expect(screen.getByText('¥40.00')).toBeTruthy()
    expect(screen.queryByText('今年工资')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '查看交易：一月工资' }))
    expect(screen.getByText('编辑交易')).toBeTruthy()
  })

  it('空周期显示零笔和空态，直接打开的链接可以返回首页', () => {
    renderPage()
    expect(screen.getByText('本周期暂无交易')).toBeTruthy()
    expect(screen.getByText('0 笔交易 · 包含所有子分类')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '返回统计' }))
    expect(screen.getByText('首页统计')).toBeTruthy()
  })

  it('无效分类给出明确提示', () => {
    renderPage('/analysis/categories/deleted')
    expect(screen.getByText('分类不存在或已删除')).toBeTruthy()
  })

  it('请求失败显示可重试状态，而不是误报没有交易', () => {
    query.error = new Error('network error')
    renderPage()
    expect(screen.getByRole('alert').textContent).toContain('明细加载失败')
    expect(screen.queryByText('本周期暂无交易')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '重新加载' }))
    expect(query.reload).toHaveBeenCalled()
  })
})
