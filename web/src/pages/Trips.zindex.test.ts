import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

// 回归测试：曾经 .trip-overlay 的 z-index=50，低于底部 tab-bar(100)，
// 导致底部弹层的下半部分（空态提示、「+ 新建旅游」按钮）被 tab-bar 盖住，
// 在 iPhone 上表现为「只有标题、没有其他内容」。此测试锁定弹层层级必须高于底部栏。
// vitest 从包根（FinFlow/web）运行，故用相对 cwd 的路径读取 CSS。

/** 取某个选择器块里的 z-index 数值（取该选择器第一次出现的规则块）。 */
function zIndexOf(css: string, selector: string): number {
  const idx = css.indexOf(selector)
  if (idx === -1) throw new Error(`选择器未找到: ${selector}`)
  const block = css.slice(idx, css.indexOf('}', idx))
  const m = block.match(/z-index:\s*(\d+)/)
  if (!m) throw new Error(`未找到 z-index: ${selector}`)
  return Number(m[1])
}

describe('旅游弹层层级', () => {
  const tripsCss = readFileSync('src/pages/Trips.css', 'utf-8')
  const layoutCss = readFileSync('src/layouts/MainLayout.css', 'utf-8')

  const overlayZ = zIndexOf(tripsCss, '.trip-overlay')
  const tabBarZ = zIndexOf(layoutCss, '.tab-bar')
  const fabZ = zIndexOf(layoutCss, '.fab')

  it('弹层必须盖住底部 tab-bar，否则弹层下半部分被遮挡', () => {
    expect(overlayZ).toBeGreaterThan(tabBarZ)
  })

  it('弹层必须盖住悬浮记账按钮 fab', () => {
    expect(overlayZ).toBeGreaterThan(fabZ)
  })
})
