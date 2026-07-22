import { describe, it, expect } from 'vitest'
import {
  tripDeleteConfirmText,
  tripDateRangeText,
  getTripCategoryGroups,
  aggregateTripByGroup,
} from './trip'
import type { Category, Transaction } from '../db/models'

// 构造分类的小工具
function cat(p: Partial<Category> & { id: string; name: string }): Category {
  return {
    type: 'expense',
    icon: '🎫',
    colorHex: '#000',
    sortOrder: 0,
    isSystem: true,
    scope: 'trip',
    ...p,
  } as Category
}
function tx(p: Partial<Transaction> & { amount: number }): Transaction {
  return { id: 'x', type: 'expense', date: '2026-07-22', time: '10:00', createdAt: '', ...p } as Transaction
}

describe('tripDeleteConfirmText', () => {
  it('包含旅游名称与「交易保留」说明', () => {
    const msg = tripDeleteConfirmText('三亚5日游')
    expect(msg).toContain('三亚5日游')
    expect(msg).toContain('关联交易保留')
  })

  it('空名称也能生成确认文案，不抛错', () => {
    expect(tripDeleteConfirmText('')).toBe('删除旅游「」？关联交易保留（仅脱离该旅游）。')
  })
})

describe('tripDateRangeText', () => {
  it('起止都有时显示「开始 ~ 结束」', () => {
    expect(tripDateRangeText({ startDate: '2026-07-22', endDate: '2026-07-28' }))
      .toBe('2026-07-22 ~ 2026-07-28')
  })

  it('只有开始日期时只显示开始', () => {
    expect(tripDateRangeText({ startDate: '2026-07-22', endDate: undefined }))
      .toBe('2026-07-22')
  })

  it('起止都缺时显示「未设日期」', () => {
    expect(tripDateRangeText({ startDate: undefined, endDate: undefined }))
      .toBe('未设日期')
  })
})

describe('getTripCategoryGroups', () => {
  const cats: Category[] = [
    cat({ id: 'g1', name: '交通', parentId: undefined, sortOrder: 0 }),
    cat({ id: 'c11', name: '打车', parentId: 'g1', sortOrder: 1 }),
    cat({ id: 'c10', name: '机票', parentId: 'g1', sortOrder: 0 }),
    cat({ id: 'g2', name: '餐饮', parentId: undefined, sortOrder: 1 }),
    cat({ id: 'c20', name: '午餐', parentId: 'g2', sortOrder: 0 }),
    // 干扰项：非 trip、以及 income 类型
    cat({ id: 'n1', name: '主分类', parentId: undefined, scope: 'normal' }),
    cat({ id: 'i1', name: '退款', parentId: undefined, type: 'income' }),
  ]

  it('按组归并叶子，组与叶子都按 sortOrder 升序', () => {
    const groups = getTripCategoryGroups(cats, 'expense')
    expect(groups.map(g => g.group.name)).toEqual(['交通', '餐饮'])
    expect(groups[0].children.map(c => c.name)).toEqual(['机票', '打车'])
    expect(groups[1].children.map(c => c.name)).toEqual(['午餐'])
  })

  it('只返回 scope=trip 且 type 匹配的分类', () => {
    const groups = getTripCategoryGroups(cats, 'expense')
    const allNames = groups.flatMap(g => [g.group.name, ...g.children.map(c => c.name)])
    expect(allNames).not.toContain('主分类') // scope=normal 被排除
    expect(allNames).not.toContain('退款')   // income 被排除
  })

  it('income 类型单独取出', () => {
    const groups = getTripCategoryGroups(cats, 'income')
    expect(groups.map(g => g.group.name)).toEqual(['退款'])
  })
})

describe('aggregateTripByGroup', () => {
  const cats: Category[] = [
    cat({ id: 'g1', name: '交通', parentId: undefined }),
    cat({ id: 'c10', name: '机票', parentId: 'g1' }),
    cat({ id: 'c11', name: '打车', parentId: 'g1' }),
    cat({ id: 'g2', name: '餐饮', parentId: undefined }),
    cat({ id: 'c20', name: '午餐', parentId: 'g2' }),
  ]
  const byId = new Map(cats.map(c => [c.id, c]))

  it('叶子交易汇总到所属组，按金额降序', () => {
    const txs: Transaction[] = [
      tx({ amount: 100, categoryId: 'c10' }), // 交通
      tx({ amount: 50, categoryId: 'c11' }),  // 交通
      tx({ amount: 200, categoryId: 'c20' }), // 餐饮
    ]
    const res = aggregateTripByGroup(txs, byId)
    expect(res.map(r => [r.group.name, r.total])).toEqual([
      ['餐饮', 200],
      ['交通', 150],
    ])
  })

  it('忽略收入与无分类交易', () => {
    const txs: Transaction[] = [
      tx({ amount: 100, categoryId: 'c10' }),
      tx({ amount: 999, categoryId: 'c10', type: 'income' }),
      tx({ amount: 999, categoryId: undefined }),
    ]
    const res = aggregateTripByGroup(txs, byId)
    expect(res).toEqual([{ group: byId.get('g1'), total: 100 }])
  })

  it('交易直接落在组上（历史数据）时用组自身', () => {
    const txs: Transaction[] = [tx({ amount: 80, categoryId: 'g1' })]
    const res = aggregateTripByGroup(txs, byId)
    expect(res).toEqual([{ group: byId.get('g1'), total: 80 }])
  })
})
