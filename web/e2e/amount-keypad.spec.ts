import { expect, test, type Locator, type Page } from '@playwright/test'
import type { Account, Category } from '../src/db/models'

const categories: Category[] = Array.from({ length: 40 }, (_, i) => ({
  id: `category-${i}`,
  name: `测试分类${i + 1}`,
  type: 'expense',
  icon: '🍜',
  colorHex: '#ff0000',
  sortOrder: i,
  isSystem: false,
}))
const accounts: Account[] = [{
  id: 'account-1', name: '测试账户', type: 'other', icon: '卡', colorHex: '#6b7280',
  initialBalance: 0, sortOrder: 0, isSystem: false, createdAt: '2026-01-01T00:00:00Z',
}]

test.beforeEach(async ({ page }) => {
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
    if (path === '/api/v1/finflow/categories') return route.fulfill({ json: categories })
    if (path === '/api/v1/finflow/accounts') return route.fulfill({ json: accounts })
    return route.fulfill({ json: [] })
  })
  await page.goto('/finflow/transactions/new')
  await expect(page.locator('.cat-row')).toHaveCount(categories.length)
  await expect(page.getByRole('dialog', { name: '输入金额' })).toBeVisible()
  await expect(page.locator('.amount-keypad-dialog')).toHaveJSProperty('open', true)
})

async function center(locator: Locator) {
  const box = await locator.boundingBox()
  expect(box).not.toBeNull()
  return { x: box!.x + box!.width / 2, y: box!.y + box!.height / 2 }
}

async function tapKey(page: Page, name: string) {
  const key = page.getByRole('button', { name, exact: true })
  const point = await center(key)
  // 按屏幕坐标命中，不用 dispatchEvent 绕过浏览器命中测试。
  expect(await page.evaluate(({ x, y }) => (
    document.elementFromPoint(x, y)?.closest('.keypad-key')?.getAttribute('aria-label')
  ), point)).toBe(name)
  await page.touchscreen.tap(point.x, point.y)
}

test('短按数字只更新金额，键盘位于模态顶层且分类不被误选', async ({ page }) => {
  const dialog = page.getByRole('dialog', { name: '输入金额' })
  expect(await dialog.evaluate(el => el.matches(':modal'))).toBe(true)
  for (const [key, value] of [
    ['1', '1'], ['2', '12'], ['小数点', '12.'], ['3', '12.3'], ['退格', '12.'], ['0', '12.0'],
  ]) {
    await tapKey(page, key)
    await expect(page.getByLabel('金额', { exact: true })).toHaveValue(value)
    await expect(page.getByLabel('当前金额')).toHaveText(`¥ ${value}`)
    await expect(dialog).toBeVisible()
    await expect(page.locator('.cat-row.selected')).toHaveCount(0)
  }
})

test('点击分类位置只关闭遮罩，再点一次才选择分类', async ({ page }) => {
  const category = page.locator('.cat-row').first()
  await page.getByRole('button', { name: '完成' }).tap()
  // 矮视口上默认分类位置可能被面板盖住，先把分类滚到上方遮罩区域。
  await category.evaluate(el => {
    const body = document.querySelector('.form-body')!
    body.scrollTop += el.getBoundingClientRect().top - body.getBoundingClientRect().top - 24
  })
  await page.getByLabel('金额', { exact: true }).evaluate(el => (el as HTMLInputElement).click())
  await expect(page.getByRole('dialog')).toBeVisible()
  const point = await center(category)
  const panel = await page.locator('.amount-keypad-panel').boundingBox()
  expect(point.y).toBeLessThan(panel!.y)
  expect(await page.evaluate(({ x, y }) => (
    document.elementFromPoint(x, y)?.classList.contains('amount-keypad-dialog')
  ), point)).toBe(true)

  await page.touchscreen.tap(point.x, point.y)
  await expect(page.getByRole('dialog')).toBeHidden()
  await expect(page.locator('.cat-row.selected')).toHaveCount(0)
  await category.tap()
  await expect(category).toHaveClass(/selected/)
})

test('完成不提交交易，焦点恢复不重开，备注输入后可以再次打开键盘', async ({ page }) => {
  const saves: string[] = []
  page.on('request', request => {
    if (request.method() === 'POST' && request.url().endsWith('/finflow/transactions')) saves.push(request.url())
  })
  await tapKey(page, '8')
  await page.getByRole('button', { name: '完成' }).tap()
  await expect(page.getByRole('dialog')).toBeHidden()
  await expect(page.getByLabel('金额', { exact: true })).toBeFocused()
  expect(saves).toHaveLength(0)

  await page.getByPlaceholder('可选', { exact: true }).fill('午餐')
  await expect(page.getByRole('dialog')).toBeHidden()
  await page.getByLabel('金额', { exact: true }).tap()
  await expect(page.getByRole('dialog')).toBeVisible()
  await tapKey(page, '9')
  await expect(page.getByLabel('金额', { exact: true })).toHaveValue('89')
  await expect(page.getByPlaceholder('可选', { exact: true })).toHaveValue('午餐')
})

test('长分类列表滚动后打开键盘，背景无法获取焦点且数字仍能短按', async ({ page }) => {
  await page.getByRole('button', { name: '完成' }).tap()
  await page.locator('.form-body').evaluate(el => { el.scrollTop = el.scrollHeight / 2 })
  expect(await page.locator('.form-body').evaluate(el => el.scrollTop)).toBeGreaterThan(0)
  // 保留背景滚动位置打开模态框，随后所有按键仍使用真实触摸坐标。
  await page.getByLabel('金额', { exact: true }).evaluate(el => (el as HTMLInputElement).click())
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByPlaceholder('可选', { exact: true }).evaluate(el => (el as HTMLElement).focus())
  expect(await page.getByRole('dialog').evaluate(el => el.contains(document.activeElement))).toBe(true)
  for (const name of ['7', '4', '1', '0']) await tapKey(page, name)
  await expect(page.getByLabel('金额', { exact: true })).toHaveValue('7410')
  await expect(page.locator('.cat-row.selected')).toHaveCount(0)

  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toBeHidden()
  await page.getByLabel('金额', { exact: true }).press('Enter')
  await expect(page.getByRole('dialog')).toBeVisible()
})
