import { describe, it, expect } from 'vitest'
import { incomeTree, expenseTree } from './seed'

describe('expenseTree', () => {
  const dining = expenseTree.find(n => n.name === '餐饮')
  const diningSubs = dining?.children ?? []

  it('餐饮包含「夜宵」「小吃」「饮料」', () => {
    const names = diningSubs.map(c => c.name)
    expect(names).toContain('夜宵')
    expect(names).toContain('小吃')
    expect(names).toContain('饮料')
  })

  it('夜宵、小吃、饮料位于晚餐之后且顺序为 晚餐→夜宵→小吃→饮料', () => {
    const idx = new Map(diningSubs.map((c, i) => [c.name, i]))
    const d = idx.get('晚餐')!
    const ln = idx.get('夜宵')!
    const sn = idx.get('小吃')!
    const dr = idx.get('饮料')!
    expect(d).toBeLessThan(ln)
    expect(ln).toBeLessThan(sn)
    expect(sn).toBeLessThan(dr)
  })

  it('夜宵、小吃、饮料 sort_order 紧跟晚餐', () => {
    const byName = new Map(diningSubs.map(c => [c.name, c]))
    const d = byName.get('晚餐')!
    expect(byName.get('夜宵')!.order).toBe(d.order + 1)
    expect(byName.get('小吃')!.order).toBe(d.order + 2)
    expect(byName.get('饮料')!.order).toBe(d.order + 3)
  })

  const transport = expenseTree.find(n => n.name === '交通')
  const transportSubs = transport?.children ?? []

  it('交通包含「高铁」且位于打车之后、其他之前', () => {
    const idx = new Map(transportSubs.map((c, i) => [c.name, i]))
    expect(idx.get('高铁')).toBeDefined()
    const taxi = idx.get('打车')!
    const hsr = idx.get('高铁')!
    const other = idx.get('其他')!
    expect(taxi).toBeLessThan(hsr)
    expect(hsr).toBeLessThan(other)
  })

  it('高铁 sort_order 紧跟打车', () => {
    const byName = new Map(transportSubs.map(c => [c.name, c]))
    expect(byName.get('高铁')!.order).toBe(byName.get('打车')!.order + 1)
  })

  const film = expenseTree.find(n => n.name === '娱乐')?.children?.find(n => n.name === '影视')
  const filmSubs = film?.children ?? []

  it('影视包含「影院」且位于爱奇艺之后、其他之前', () => {
    const idx = new Map(filmSubs.map((c, i) => [c.name, i]))
    expect(idx.get('影院')).toBeDefined()
    const iqiyi = idx.get('爱奇艺')!
    const cinema = idx.get('影院')!
    const other = idx.get('其他')!
    expect(iqiyi).toBeLessThan(cinema)
    expect(cinema).toBeLessThan(other)
  })

  it('影院 sort_order 紧跟爱奇艺', () => {
    const byName = new Map(filmSubs.map(c => [c.name, c]))
    expect(byName.get('影院')!.order).toBe(byName.get('爱奇艺')!.order + 1)
  })

  it('餐饮包含「外卖」，位于饮料之后、聚餐AA之前', () => {
    const idx = new Map(diningSubs.map((c, i) => [c.name, i]))
    expect(idx.get('外卖')).toBeDefined()
    expect(idx.get('饮料')!).toBeLessThan(idx.get('外卖')!)
    expect(idx.get('外卖')!).toBeLessThan(idx.get('聚餐AA')!)
    const byName = new Map(diningSubs.map(c => [c.name, c]))
    expect(byName.get('外卖')!.order).toBe(byName.get('饮料')!.order + 1)
  })

  it('购物包含「外卖」，位于抖音之后、其他之前', () => {
    const shopping = expenseTree.find(n => n.name === '购物')
    const shoppingSubs = shopping?.children ?? []
    const idx = new Map(shoppingSubs.map((c, i) => [c.name, i]))
    expect(idx.get('外卖')).toBeDefined()
    expect(idx.get('抖音')!).toBeLessThan(idx.get('外卖')!)
    expect(idx.get('外卖')!).toBeLessThan(idx.get('其他')!)
    const byName = new Map(shoppingSubs.map(c => [c.name, c]))
    expect(byName.get('外卖')!.order).toBe(byName.get('抖音')!.order + 1)
  })

  it('住房将水费和电费分开', () => {
    const housingSubs = expenseTree.find(n => n.name === '住房')?.children ?? []
    expect(housingSubs.map(c => c.name)).toEqual(['租金', '水费', '电费', '物业', '其他'])
    expect(housingSubs.map(c => c.order)).toEqual([100, 101, 102, 103, 104])
  })
})

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
