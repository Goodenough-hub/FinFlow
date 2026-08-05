import { describe, it, expect } from 'vitest'
import type { Account } from '../db/models'
import { getChildrenMap, isLeafAccount, getLeafAccounts, reverseInitialBalance, accountDisplayBalance } from './account'

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

describe('reverseInitialBalance', () => {
  it('叶子：当前余额从 26554.32 改为 30000，初始余额按 delta 反算', () => {
    // 旧初始 24516.40，旧当前 26554.32；改当前到 30000
    const result = reverseInitialBalance(24516.4, 26554.32, 30000)
    expect(result).toBeCloseTo(24516.4 + (30000 - 26554.32), 2)
  })

  it('当前余额不变时，初始余额不变', () => {
    expect(reverseInitialBalance(100, 250, 250)).toBe(100)
  })

  it('调小当前余额，初始余额同额减少', () => {
    expect(reverseInitialBalance(100, 250, 200)).toBe(50)
  })
})

describe('accountDisplayBalance', () => {
  it('叶子账户返回自身余额', () => {
    const own = new Map([['a', 123.45]])
    expect(accountDisplayBalance('a', new Map(), own)).toBeCloseTo(123.45, 2)
  })

  it('容器账户返回 自身 + Σ子账户', () => {
    const parent = makeAccount('p')
    const c1 = makeAccount('c1', { parentId: 'p' })
    const c2 = makeAccount('c2', { parentId: 'p' })
    const childrenMap = getChildrenMap([parent, c1, c2])
    const own = new Map([['p', 10], ['c1', 100], ['c2', 200]])
    expect(accountDisplayBalance('p', childrenMap, own)).toBe(310)
  })

  it('容器自身余额为 0 时等于 Σ子账户', () => {
    const parent = makeAccount('p')
    const c1 = makeAccount('c1', { parentId: 'p' })
    const childrenMap = getChildrenMap([parent, c1])
    const own = new Map([['p', 0], ['c1', 500]])
    expect(accountDisplayBalance('p', childrenMap, own)).toBe(500)
  })

  it('缺失余额按 0 处理', () => {
    expect(accountDisplayBalance('missing', new Map(), new Map())).toBe(0)
  })
})
