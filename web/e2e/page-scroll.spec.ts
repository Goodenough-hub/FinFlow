import { expect, test, type Page } from '@playwright/test'
import type { Transaction } from '../src/db/models'

// 回归：overflow-x: hidden 曾把 body 变成滚动容器（overflow-y 的 visible 被
// 强制计算为 auto），纵向滚动从视口移到 body 上，iOS 主屏幕 PWA 里视口没有
// 可滚内容，整个页面被 WKWebView 上下左右橡皮筋拖动。修复后纵向滚动必须
// 回到视口，横向在任何情况下都不可滚。
const transactions: Transaction[] = Array.from({ length: 100 }, (_, i) => ({
  id: `scroll-tx-${i}`, amount: 10, type: 'expense',
  note: i % 5 === 0 ? `超长备注测试横向溢出 abcdefghijklmnopqrstuvwxyz0123456789-${i}` : `滚动测试流水${i}`,
  date: '2026-10-15', createdAt: new Date(2026, 9, 15, 0, i).toISOString(),
}))

async function openTransactions(page: Page) {
  await page.clock.setFixedTime(new Date('2026-10-15T12:00:00'))
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
    return route.fulfill({ json: [] })
  })
  await page.goto('/finflow/transactions')
  await expect(page.locator('.tx-list .tx-row')).toHaveCount(transactions.length)
}

test('长列表由视口滚动而不是 body', async ({ page }) => {
  await openTransactions(page)

  const metrics = await page.evaluate(() => ({
    docScrollH: document.documentElement.scrollHeight,
    innerH: window.innerHeight,
    bodyOverflowY: getComputedStyle(document.body).overflowY,
  }))
  // 内容高于视口时，文档必须可滚（body 当滚动容器时这里恒等于视口高）。
  expect(metrics.docScrollH).toBeGreaterThan(metrics.innerH)
  // body 不得成为滚动容器（visible 才会把滚动留给视口）。
  expect(metrics.bodyOverflowY).toBe('visible')

  // window 级滚动必须生效（body 当滚动容器时 window.scrollTo 是空操作）。
  await page.evaluate(() => window.scrollTo(0, 400))
  expect(await page.evaluate(() => window.scrollY)).toBe(400)
})

test('横向任何情况下不可滚动', async ({ page }) => {
  await openTransactions(page)

  const scrollW = await page.evaluate(() => document.documentElement.scrollWidth)
  expect(scrollW).toBeLessThanOrEqual(await page.evaluate(() => window.innerWidth))

  // 连脚本滚动都不允许让页面内容横向偏移（Android 浏览器记住横向 scroll 位置的回归）。
  // 注意：WebKit 移动仿真下 innerWidth(390) 比 visualViewport.width(384) 宽 6px，
  // window.scrollX/documentElement.scrollLeft 会反映这个视觉视口排水位（真机两者相等），
  // 因此断言落在 body 上——clip 禁止其产生任何横向滚动位置。
  await page.evaluate(() => window.scrollTo(300, 0))
  expect(await page.evaluate(() => document.body.scrollLeft)).toBe(0)
})
