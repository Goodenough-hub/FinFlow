import { expect, test, type Page } from '@playwright/test'

// 首页看板回归：KPI 四格、收入分配条、收支趋势（月/季/年切换）、分类环形下钻。
// reducedMotion 关闭 ECharts 动画，避免动画中截图/断言读到中间态。

const categories = [
  { id: 'c-food', name: '餐饮', type: 'expense', parentId: null, sortOrder: 1, icon: '🍜', colorHex: '#f59e0b' },
  { id: 'c-food-waimai', name: '外卖', type: 'expense', parentId: 'c-food', sortOrder: 1, icon: '🛵', colorHex: '#fbbf24' },
  { id: 'c-food-dining', name: '下馆子', type: 'expense', parentId: 'c-food', sortOrder: 2, icon: '🍽️', colorHex: '#d97706' },
  { id: 'c-traffic', name: '交通', type: 'expense', parentId: null, sortOrder: 2, icon: '🚇', colorHex: '#3b82f6' },
  { id: 'c-shopping', name: '购物', type: 'expense', parentId: null, sortOrder: 3, icon: '🛍️', colorHex: '#ec4899' },
  { id: 'c-salary', name: '工资', type: 'income', parentId: null, sortOrder: 1, icon: '💰', colorHex: '#10b981' },
]

const transactions = (() => {
  const list: Array<Record<string, unknown>> = []
  let id = 0
  // 近 6 个月：每月工资 12000，支出分别 6000/6500/7200/7800/7400/8000
  for (let m = 5; m >= 0; m--) {
    const d = new Date(2026, 9 - m, 1)
    const ym = (n: number) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(n).padStart(2, '0')}`
    list.push({ id: `t${id++}`, type: 'income', amount: 12000, categoryId: 'c-salary', accountId: 'a1', date: ym(1), note: '工资', createdAt: `${ym(1)}T09:00:00` })
    const exp = [6000, 6500, 7200, 7800, 7400, 8000][5 - m]
    list.push({ id: `t${id++}`, type: 'expense', amount: exp * 0.35, categoryId: 'c-food-waimai', accountId: 'a1', date: ym(3), note: '外卖', createdAt: `${ym(3)}T12:00:00` })
    list.push({ id: `t${id++}`, type: 'expense', amount: exp * 0.15, categoryId: 'c-food-dining', accountId: 'a1', date: ym(8), note: '聚餐', createdAt: `${ym(8)}T19:00:00` })
    list.push({ id: `t${id++}`, type: 'expense', amount: exp * 0.3, categoryId: 'c-traffic', accountId: 'a1', date: ym(5), note: '地铁通勤', createdAt: `${ym(5)}T08:00:00` })
    list.push({ id: `t${id++}`, type: 'expense', amount: exp * 0.2, categoryId: 'c-shopping', accountId: 'a1', date: ym(12), note: '衣服', createdAt: `${ym(12)}T15:00:00` })
  }
  return list
})()

test.use({ reducedMotion: 'reduce' })

async function openHome(page: Page) {
  await page.clock.setFixedTime(new Date('2026-10-22T12:00:00'))
  await page.addInitScript(() => localStorage.setItem('finflow_token', 'e2e-test-token'))
  await page.route('https://fonts.googleapis.com/**', route => route.abort())
  await page.route('**/api/v1/**', route => {
    const path = new URL(route.request().url()).pathname
    if (path === '/api/v1/auth/refresh') {
      return route.fulfill({ json: {
        token: 'e2e-test-token', userId: 'e2e', username: '测试用户',
        role: 'user', appScope: ['finflow'], avatar: '', expiresAt: 9999999999,
      } })
    }
    if (path === '/api/v1/finflow/transactions') return route.fulfill({ json: transactions })
    if (path === '/api/v1/finflow/categories') return route.fulfill({ json: categories })
    return route.fulfill({ json: [] })
  })
  await page.goto('/finflow/')
  await expect(page.locator('.kpi-grid')).toBeVisible()
}

test('KPI 四格：金额与环比', async ({ page }) => {
  await openHome(page)

  const income = page.locator('[data-kpi="income"]')
  await expect(income).toContainText('本月收入')
  await expect(income).toContainText('¥12,000.00')
  await expect(income).toContainText('较上月 0.0%')

  const expense = page.locator('[data-kpi="expense"]')
  await expect(expense).toContainText('¥8,000.00')
  await expect(expense).toContainText('+8.1%')

  const balance = page.locator('[data-kpi="balance"]')
  await expect(balance).toContainText('¥4,000.00')

  const rate = page.locator('[data-kpi="rate"]')
  await expect(rate).toContainText('33.3%')
  // 9 月结余率 (12000-7400)/12000 = 38.3%，环比 -5.0 个百分点
  await expect(rate).toContainText('-5.0pp')
})

test('收入分配条：占比与口径文字', async ({ page }) => {
  await openHome(page)

  const card = page.locator('.alloc-card')
  await expect(card).toContainText('支出 66.7%')
  await expect(card).toContainText('结余 33.3%')
  await expect(card).toContainText('本期收入 ¥12,000.00 = 支出 ¥8,000.00 + 结余 ¥4,000.00')
})

test('收支趋势：月季年切换改变坐标桶', async ({ page }) => {
  await openHome(page)

  const card = page.locator('.trend-card')
  await expect(card.locator('svg')).toContainText('10月')

  await card.getByRole('tab', { name: '季' }).click()
  await expect(card.locator('svg')).toContainText('26Q3')

  await card.getByRole('tab', { name: '年' }).click()
  await expect(card.locator('svg')).toContainText('2026年')

  await card.getByRole('tab', { name: '月' }).click()
  await expect(card.locator('svg')).toContainText('10月')
})

test('分类环形：排行占比、下钻子分类、叶子跳账单页带筛选', async ({ page }) => {
  await openHome(page)

  // 顶层排行：餐饮 50% / 交通 30% / 购物 20%
  const section = page.locator('.category-section')
  await expect(section.locator('.breakdown-row', { hasText: '餐饮' })).toContainText('¥4,000.00')
  await expect(section.locator('.breakdown-row', { hasText: '餐饮' })).toContainText('50.0%')

  // 下钻餐饮 → 子分类
  await section.locator('.breakdown-row', { hasText: '餐饮' }).click()
  await expect(section.locator('.breadcrumb')).toContainText('餐饮')
  await expect(section.locator('.breakdown-row', { hasText: '外卖' })).toContainText('¥2,800.00')
  await expect(section.locator('.breakdown-row', { hasText: '外卖' })).toContainText('70.0%')
  await expect(section.locator('.breakdown-row', { hasText: '下馆子' })).toContainText('¥1,200.00')

  // 点击叶子分类 → 跳账单页，URL 带分类与月份筛选
  await section.locator('.breakdown-row', { hasText: '外卖' }).click()
  await expect(page).toHaveURL(/\/finflow\/transactions\?.*categoryId=c-food-waimai/)
  await expect(page).toHaveURL(/month=2026-10/)
  await expect(page.locator('.tx-list .tx-row')).toHaveCount(1)
  await expect(page.locator('.tx-list')).toContainText('外卖')
})

test('面包屑返回顶层', async ({ page }) => {
  await openHome(page)

  const section = page.locator('.category-section')
  await section.locator('.breakdown-row', { hasText: '餐饮' }).click()
  await expect(section.locator('.breakdown-row', { hasText: '外卖' })).toBeVisible()

  await section.locator('.breadcrumb .crumb', { hasText: '全部' }).click()
  await expect(section.locator('.breakdown-row', { hasText: '交通' })).toBeVisible()
})
