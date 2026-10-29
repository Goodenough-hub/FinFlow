import { expect, test, type Page } from '@playwright/test'
import type { Category, Transaction } from '../src/db/models'

const categories: Category[] = [
  { id: 'food', name: '餐饮', type: 'expense', icon: '🍜', colorHex: '#F59E0B', sortOrder: 0, isSystem: false },
  { id: 'lunch', name: '午餐', type: 'expense', parentId: 'food', icon: '🍚', colorHex: '#F97316', sortOrder: 0, isSystem: false },
  { id: 'work', name: '工作餐', type: 'expense', parentId: 'lunch', icon: '🍱', colorHex: '#EF4444', sortOrder: 0, isSystem: false },
  { id: 'travel', name: '出行', type: 'expense', icon: '🚕', colorHex: '#3B82F6', sortOrder: 1, isSystem: false },
  { id: 'salary', name: '工资', type: 'income', icon: '💰', colorHex: '#10B981', sortOrder: 0, isSystem: false }
]
const transactions: Transaction[] = [
  ...Array.from({ length: 60 }, (_, i): Transaction => ({
    id: `lunch-${i}`, categoryId: 'work', amount: 10, type: 'expense',
    note: `工作餐记录${i}`, date: '2026-09-15', time: `12:${String(i).padStart(2, '0')}`,
    createdAt: `2026-09-15T12:${String(i).padStart(2, '0')}:00Z`
  })),
  { id: 'direct', categoryId: 'food', amount: 25, type: 'expense', note: '直接餐饮记录', date: '2026-09-16', createdAt: '2026-09-16T00:00:00Z' },
  { id: 'other', categoryId: 'travel', amount: 35, type: 'expense', note: '打车记录', date: '2026-09-16', createdAt: '2026-09-16T00:00:00Z' },
  { id: 'wrong-month', categoryId: 'food', amount: 100, type: 'expense', note: '十月餐饮记录', date: '2026-10-01', createdAt: '2026-10-01T00:00:00Z' },
  { id: 'income-jan', categoryId: 'salary', amount: 5000, type: 'income', note: '一月工资', date: '2025-01-10', createdAt: '2025-01-10T00:00:00Z' },
  { id: 'income-dec', categoryId: 'salary', amount: 6000, type: 'income', note: '十二月工资', date: '2025-12-10', createdAt: '2025-12-10T00:00:00Z' }
]

async function setup(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.clock.setFixedTime(new Date('2026-10-29T12:00:00'))
  await page.addInitScript(() => localStorage.setItem('finflow_token', 'e2e-test-token'))
  await page.route('https://fonts.googleapis.com/**', route => route.abort())
  await page.route('**/api/v1/**', async route => {
    const path = new URL(route.request().url()).pathname
    if (path === '/api/v1/auth/refresh') return route.fulfill({ json: {
      token: 'e2e-test-token', userId: 'e2e', username: '测试用户', role: 'user',
      appScope: ['finflow'], avatar: '', expiresAt: 9999999999
    } })
    if (path === '/api/v1/finflow/categories') return route.fulfill({ json: categories })
    if (path === '/api/v1/finflow/transactions') {
      // 返回页面时异步加载仍应恢复滚动，而不是被短暂的空列表截断。
      await new Promise(resolve => setTimeout(resolve, 120))
      return route.fulfill({ json: transactions })
    }
    if (path.startsWith('/api/v1/finflow/transactions/')) {
      return route.fulfill({ json: transactions.find(t => path.endsWith(`/${t.id}`)) })
    }
    return route.fulfill({ json: [] })
  })
}

async function waitForHome(page: Page) {
  await expect(page.locator('.home-page .breakdown-row').first()).toBeVisible()
  await page.locator('.home-page').evaluate(async el => {
    await Promise.all(el.getAnimations({ subtree: true }).map(a => a.finished))
  })
}

test('父子分类明细逐层返回，保留首页月份、分类层级和滚动位置', async ({ page }, testInfo) => {
  await setup(page)
  await page.goto('/finflow/')
  await page.locator('.period-picker').getByRole('button', { name: '上一期' }).click()
  await waitForHome(page)
  const food = page.locator('.home-page').getByRole('button', { name: /餐饮.*625/ })
  await food.scrollIntoViewIfNeeded()
  const homeY = await page.evaluate(() => window.scrollY)
  await food.click()
  await expect(page).toHaveURL(/analysis\/categories\/food\?period=month&month=2026-09/)
  await expect(page.getByRole('heading', { name: '2026年9月 · 餐饮支出' })).toBeVisible()
  await expect(page.locator('.category-detail-amount')).toHaveText('¥625.00')
  await expect(page.locator('.category-detail-transaction')).toHaveCount(61)
  await expect(page.getByText('十月餐饮记录')).toHaveCount(0)
  await expect(page.getByText('直接记入本分类')).toBeVisible()
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)
  await page.screenshot({ path: testInfo.outputPath('category-detail.png'), animations: 'disabled' })

  const lunch = page.getByRole('button', { name: /午餐.*600/ })
  await lunch.scrollIntoViewIfNeeded()
  const parentY = await page.evaluate(() => window.scrollY)
  await lunch.click()
  await expect(page.getByRole('heading', { name: '2026年9月 · 午餐支出' })).toBeVisible()
  await page.getByRole('button', { name: /工作餐.*600/ }).click()
  await expect(page.getByRole('heading', { name: '2026年9月 · 工作餐支出' })).toBeVisible()
  await expect(page.getByText('餐饮 / 午餐 / 工作餐')).toBeVisible()
  await expect(page.locator('.category-detail-transaction')).toHaveCount(60)

  // 编辑后取消仍返回当前分类，并保留长明细列表的阅读位置。
  const transaction = page.locator('.category-detail-transaction').nth(20)
  await transaction.scrollIntoViewIfNeeded()
  const childY = await page.evaluate(() => window.scrollY)
  await transaction.click()
  await page.getByRole('button', { name: '完成', exact: true }).click()
  await page.getByRole('button', { name: '取消', exact: true }).click()
  await expect(page.locator('.category-detail-transaction')).toHaveCount(60)
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeCloseTo(childY, 0)

  await page.getByRole('button', { name: '返回统计' }).click()
  await expect(page.getByRole('heading', { name: '2026年9月 · 午餐支出' })).toBeVisible()
  await page.goBack()
  await expect(page.locator('.category-detail-transaction')).toHaveCount(61)
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeCloseTo(parentY, 0)
  await page.getByRole('button', { name: '返回统计' }).click()
  await waitForHome(page)
  await expect(page.locator('.period-title')).toHaveText('2026年9月')
  await expect(page.locator('.type-tab .active')).toHaveText('支出')
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeCloseTo(homeY, 0)
  await page.getByRole('link', { name: '账单', exact: true }).click()
  await expect(page).toHaveURL(/\/finflow\/transactions$/)
  await expect(page.locator('.filter-clear')).toHaveCount(0)
})

test('收入末级分类直接进入年度明细，返回保留年度和收入选项', async ({ page }) => {
  await setup(page)
  await page.goto('/finflow/?period=year&year=2025&type=income')
  await waitForHome(page)
  await page.locator('.home-page').getByRole('button', { name: /工资.*11,000/ }).click()
  await expect(page.getByRole('heading', { name: '2025年 · 工资收入' })).toBeVisible()
  await expect(page.locator('.category-detail-amount')).toHaveText('¥11,000.00')
  await expect(page.locator('.category-detail-transaction')).toHaveCount(2)
  await page.reload()
  await expect(page.getByRole('heading', { name: '2025年 · 工资收入' })).toBeVisible()
  await page.getByRole('button', { name: '返回统计' }).click()
  await waitForHome(page)
  await expect(page.locator('.period-title')).toHaveText('2025年')
  await expect(page.locator('.type-tab .active')).toHaveText('收入')
})

test('独立链接的空周期、已删除分类与首页返回', async ({ page }) => {
  await setup(page)
  await page.goto('/finflow/analysis/categories/food?period=month&month=2024-01')
  await expect(page.getByText('本周期暂无交易')).toBeVisible()
  await expect(page.locator('.category-detail-amount')).toHaveText('¥0.00')
  await page.getByRole('button', { name: '返回统计' }).click()
  await expect(page.locator('.period-title')).toHaveText('2024年1月')
  await page.goto('/finflow/analysis/categories/deleted')
  await expect(page.getByText('分类不存在或已删除')).toBeVisible()
})
