import { describe, it, expect } from 'vitest'
import type { Account } from '../db/models'
import { getChildrenMap, isLeafAccount, getLeafAccounts } from './account'

function makeAccount(id: string, overrides: Partial<Account> = {}): Account {
  return {
    id,
    name: id,
    type: 'alipay',
    icon: '支',
    colorHex: '#1677FF',
    initialBalance: 0,
    sortOrder: 0,
    isSystem: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('getChildrenMap', () => {
  it('空数组返回空 map', () => {
    expect(getChildrenMap([]).size).toBe(0)
  })

  it('把子账户按 parentId 分组', () => {
    const parent = makeAccount('p1')
    const child1 = makeAccount('c1', { parentId: 'p1' })
    const child2 = makeAccount('c2', { parentId: 'p1' })
    const other = makeAccount('p2')
    const map = getChildrenMap([parent, child1, child2, other])
    expect(map.size).toBe(1)
    expect(map.get('p1')?.map(a => a.id)).toEqual(['c1', 'c2'])
    expect(map.has('p2')).toBe(false)
  })
})

describe('isLeafAccount', () => {
  it('有 parentId 的账户是叶子', () => {
    const child = makeAccount('c1', { parentId: 'p1' })
    expect(isLeafAccount(child, new Map())).toBe(true)
  })

  it('无 parentId 且无子账户的主账户是叶子', () => {
    const main = makeAccount('p1')
    expect(isLeafAccount(main, new Map())).toBe(true)
  })

  it('无 parentId 但有子账户的分组容器不是叶子', () => {
    const group = makeAccount('p1')
    const map = new Map([['p1', [makeAccount('c1', { parentId: 'p1' })]]])
    expect(isLeafAccount(group, map)).toBe(false)
  })
})

describe('getLeafAccounts', () => {
  it('过滤掉分组容器，保留叶子账户', () => {
    const group = makeAccount('p1')
    const child = makeAccount('c1', { parentId: 'p1' })
    const standalone = makeAccount('p2')
    const result = getLeafAccounts([group, child, standalone])
    expect(result.map(a => a.id).sort()).toEqual(['c1', 'p2'])
  })

  it('空数组返回空数组', () => {
    expect(getLeafAccounts([])).toEqual([])
  })
})
