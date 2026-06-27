import { describe, it, expect } from 'vitest'
import { incomeTree } from './seed'

describe('incomeTree', () => {
  it('投资分类包含 4 个理财收益子分类', () => {
    const invest = incomeTree.find(n => n.name === '投资')
    expect(invest).toBeDefined()
    expect(invest?.children).toBeDefined()

    const names = (invest?.children ?? []).map(c => c.name)
    expect(names).toEqual(['余额宝收益', '零钱通收益', '理财收益', '其他'])
  })

  it('投资子分类全部为收入类型语义（颜色与父分类解耦，用收益绿）', () => {
    const invest = incomeTree.find(n => n.name === '投资')
    const subs = invest?.children ?? []
    expect(subs.length).toBeGreaterThan(0)
    for (const sub of subs) {
      expect(sub.icon).toBeTruthy()
      expect(sub.color).toMatch(/^#[0-9A-Fa-f]{6}$/)
      expect(typeof sub.order).toBe('number')
    }
  })

  it('顶级收入分类仍为 4 个', () => {
    expect(incomeTree.map(n => n.name)).toEqual(['工资', '投资', '兼职', '其他收入'])
  })
})
