import { describe, it, expect } from 'vitest'
import { isTextEntryTarget } from './focus'

describe('isTextEntryTarget', () => {
  it('textarea 视为文本录入（应隐藏自定义键盘）', () => {
    expect(isTextEntryTarget({ tagName: 'TEXTAREA' })).toBe(true)
  })
  it('非只读 input（含日期/时间）视为录入', () => {
    expect(isTextEntryTarget({ tagName: 'INPUT', readOnly: false })).toBe(true)
  })
  it('只读金额输入框不视为录入（不隐藏自定义键盘）', () => {
    expect(isTextEntryTarget({ tagName: 'INPUT', readOnly: true })).toBe(false)
  })
  it('按钮/普通 div 不视为录入', () => {
    expect(isTextEntryTarget({ tagName: 'BUTTON' })).toBe(false)
    expect(isTextEntryTarget({ tagName: 'DIV' })).toBe(false)
  })
  it('null/空对象安全返回 false', () => {
    expect(isTextEntryTarget(null)).toBe(false)
    expect(isTextEntryTarget({})).toBe(false)
  })
})
