// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { installLongPressMenuGuard } from './longPressMenu'

// 返回事件是否被 preventDefault（true = 系统长按菜单被屏蔽）
function longPressMenu(el: Element): boolean {
  const e = new MouseEvent('contextmenu', { bubbles: true, cancelable: true })
  el.dispatchEvent(e)
  return e.defaultPrevented
}

describe('installLongPressMenuGuard', () => {
  let uninstall: () => void

  beforeEach(() => {
    document.body.innerHTML = `
      <nav><a href="/finflow/transactions"><span id="tab-label">账单</span></a></nav>
      <button id="btn">支出</button>
      <input id="amount" />
      <textarea id="note"></textarea>
      <div contenteditable="true"><span id="editable">备注</span></div>
    `
    uninstall = installLongPressMenuGuard()
  })

  afterEach(() => {
    uninstall()
    document.body.innerHTML = ''
  })

  it('长按链接（含其内部文字）不弹系统菜单，避免开出新页面', () => {
    expect(longPressMenu(document.querySelector('a')!)).toBe(true)
    expect(longPressMenu(document.getElementById('tab-label')!)).toBe(true)
  })

  it('长按按钮不弹系统菜单', () => {
    expect(longPressMenu(document.getElementById('btn')!)).toBe(true)
  })

  it('输入框、文本域、可编辑区域保留系统菜单（粘贴/选词）', () => {
    expect(longPressMenu(document.getElementById('amount')!)).toBe(false)
    expect(longPressMenu(document.getElementById('note')!)).toBe(false)
    expect(longPressMenu(document.getElementById('editable')!)).toBe(false)
  })

  it('卸载后恢复系统默认行为', () => {
    uninstall()
    expect(longPressMenu(document.getElementById('btn')!)).toBe(false)
    uninstall = () => {}
  })
})
