import { expect, test, type Locator, type Page } from '@playwright/test'
import type { Transaction } from '../src/db/models'

const transactions: Transaction[] = Array.from({ length: 100 }, (_, i) => ({
  id: `calendar-tx-${i}`, amount: 10, type: 'expense', note: `日历测试流水${i}`,
  date: '2026-10-15', createdAt: new Date(2026, 9, 15, 0, i).toISOString(),
}))

async function openCalendar(page: Page, items = transactions) {
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
    if (path === '/api/v1/finflow/transactions') return route.fulfill({ json: items })
    return route.fulfill({ json: [] })
  })
  await page.goto('/finflow/transactions')
  if (items.length) await expect(page.locator('.tx-list .tx-row')).toHaveCount(items.length)
  await page.getByRole('button', { name: '日历视图' }).click()
}

async function openDay(page: Page) {
  await page.locator('.cal-cell').filter({ has: page.locator('.cal-day', { hasText: /^15$/ }) }).click()
  await expect(page.getByRole('dialog', { name: '10月15日 流水' })).toBeVisible()
  // 几何断言在入场动画结束后执行。
  await page.locator('.day-sheet').evaluate(async el => {
    await Promise.all(el.getAnimations().map(animation => animation.finished))
  })
}

async function bounds(locator: Locator) {
  const box = await locator.boundingBox()
  expect(box).not.toBeNull()
  return box!
}

const scenarios = [
  { name: '竖屏刘海', width: 390, height: 844, top: 59, bottom: 34, side: 0 },
  { name: '横屏刘海', width: 844, height: 390, top: 0, bottom: 21, side: 59 },
  { name: '短视口刘海', width: 390, height: 320, top: 59, bottom: 34, side: 0 },
  { name: '桌面', width: 1280, height: 800, top: 0, bottom: 0, side: 0 },
]

for (const scenario of scenarios) {
  test(`${scenario.name}百笔流水：安全区内固定标题、完整滚动和坐标关闭`, async ({ page }) => {
    await page.setViewportSize({ width: scenario.width, height: scenario.height })
    await openCalendar(page)
    // 浏览器设备仿真不提供真实刘海，用安全区变量注入确定的几何边界。
    await page.addStyleTag({ content: `.day-sheet-overlay {
      --day-sheet-safe-top: ${scenario.top}px;
      --day-sheet-safe-bottom: ${scenario.bottom}px;
      --day-sheet-safe-left: ${scenario.side}px;
      --day-sheet-safe-right: ${scenario.side}px;
    }` })
    await openDay(page)

    const sheet = page.locator('.day-sheet')
    const body = sheet.locator('.dialog-body')
    const header = sheet.locator('.dialog-header')
    const close = sheet.getByRole('button', { name: '关闭' })
    const sheetBox = await bounds(sheet)
    const headerBefore = await bounds(header)
    const closeBox = await bounds(close)
    const bodyBox = await bounds(body)
    expect(sheetBox.y).toBeGreaterThanOrEqual(scenario.top + 12 - 1)
    expect(closeBox.x).toBeGreaterThanOrEqual(scenario.side)
    expect(closeBox.y).toBeGreaterThanOrEqual(scenario.top + 12)
    expect(closeBox.width).toBeGreaterThanOrEqual(44)
    expect(closeBox.height).toBeGreaterThanOrEqual(44)
    expect(bodyBox.y + bodyBox.height).toBeLessThanOrEqual(scenario.height - scenario.bottom + 1)
    expect(sheetBox.x + sheetBox.width).toBeLessThanOrEqual(scenario.width - scenario.side + 1)
    expect(sheetBox.width).toBeLessThanOrEqual(640)
    await expect(sheet.locator('.day-sheet-row')).toHaveCount(100)
    expect(await body.evaluate(el => el.scrollHeight > el.clientHeight)).toBe(true)

    await body.evaluate(el => { el.scrollTop = el.scrollHeight })
    const lastRow = sheet.locator('.day-sheet-row').last()
    const lastBox = await bounds(lastRow)
    expect(lastBox.y).toBeGreaterThanOrEqual(bodyBox.y - 1)
    expect(lastBox.y + lastBox.height).toBeLessThanOrEqual(bodyBox.y + bodyBox.height + 1)
    expect(await bounds(header)).toEqual(headerBefore)

    // 真正命中关闭按钮，避免 force click / dispatchEvent 掩盖遮挡问题。
    const point = { x: closeBox.x + closeBox.width / 2, y: closeBox.y + closeBox.height / 2 }
    expect(await page.evaluate(({ x, y }) => (
      document.elementFromPoint(x, y)?.closest('button')?.textContent
    ), point)).toBe('关闭')
    await page.touchscreen.tap(point.x, point.y)
    await expect(sheet).toHaveCount(0)
  })
}

for (const count of [0, 1]) {
  test(`${count}笔流水保持自适应高度且点击遮罩可以关闭`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    // 整月无交易时页面不展示日历；用另一天的流水验证选中日期的空态。
    const items = count === 0
      ? [{ ...transactions[0], date: '2026-10-16' }]
      : transactions.slice(0, count)
    await openCalendar(page, items)
    await openDay(page)
    const sheet = page.locator('.day-sheet')
    expect((await bounds(sheet)).height).toBeLessThan(422)
    if (count === 0) await expect(sheet.getByText('该日无交易')).toBeVisible()
    else await expect(sheet.locator('.day-sheet-row')).toHaveCount(1)
    await page.touchscreen.tap(195, 100)
    await expect(sheet).toHaveCount(0)
  })
}

test('视口缩短后重新约束长流水弹层，关闭按钮仍可点击', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await openCalendar(page)
  await page.addStyleTag({ content: '.day-sheet-overlay { --day-sheet-safe-top: 59px; }' })
  await openDay(page)
  await page.setViewportSize({ width: 390, height: 320 })
  const sheet = page.locator('.day-sheet')
  await expect.poll(async () => (await bounds(sheet)).y).toBeGreaterThanOrEqual(70)
  await sheet.getByRole('button', { name: '关闭' }).tap()
  await expect(sheet).toHaveCount(0)
})
