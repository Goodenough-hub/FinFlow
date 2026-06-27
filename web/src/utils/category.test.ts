import { describe, it, expect } from 'vitest'
import type { Category, Transaction } from '../db/models'
import {
  collectDescendantIds,
  hasChildren,
  siblingsOf,
  amountForCategory,
  countForCategory,
  directParentAmount,
  directParentCount,
  categoryById
} from './category'

function makeCat(id: string, type: 'income' | 'expense', parentId?: string, sortOrder = 0): Category {
  return {
    id,
    name: id,
    type,
    icon: '🏷',
    colorHex: '#5B8DEF',
    sortOrder,
    isSystem: false,
    parentId
  }
}

function makeTx(id: string, type: 'income' | 'expense', amount: number, categoryId?: string): Transaction {
  return {
    id,
    amount,
    type,
    note: '',
    date: '2026-06-15',
    createdAt: '2026-06-15T00:00:00.000Z',
    categoryId
  }
}

describe('category utils', () => {
  const categories: Category[] = [
    makeCat('food', 'expense', undefined, 0),
    makeCat('breakfast', 'expense', 'food', 0),
    makeCat('lunch', 'expense', 'food', 1),
    makeCat('dinner', 'expense', 'food', 2),
    makeCat('lunch-company', 'expense', 'lunch', 0),
    makeCat('salary', 'income', undefined, 0)
  ]

  describe('collectDescendantIds', () => {
    it('收集所有后代', () => {
      const ids = collectDescendantIds('food', categories)
      expect(ids.has('breakfast')).toBe(true)
      expect(ids.has('lunch')).toBe(true)
      expect(ids.has('dinner')).toBe(true)
      expect(ids.has('lunch-company')).toBe(true)
      expect(ids.size).toBe(4)
    })

    it('叶子节点返回空集', () => {
      const ids = collectDescendantIds('breakfast', categories)
      expect(ids.size).toBe(0)
    })

    it('不包含自身', () => {
      const ids = collectDescendantIds('food', categories)
      expect(ids.has('food')).toBe(false)
    })
  })

  describe('hasChildren', () => {
    it('有子分类返回 true', () => {
      expect(hasChildren('food', categories)).toBe(true)
      expect(hasChildren('lunch', categories)).toBe(true)
    })
    it('叶子分类返回 false', () => {
      expect(hasChildren('breakfast', categories)).toBe(false)
      expect(hasChildren('salary', categories)).toBe(false)
    })
  })

  describe('siblingsOf', () => {
    it('返回同级分类按 sortOrder 排序', () => {
      const sibs = siblingsOf('food', 'expense', categories)
      expect(sibs.map(c => c.id)).toEqual(['breakfast', 'lunch', 'dinner'])
    })

    it('顶级分类传 undefined', () => {
      const sibs = siblingsOf(undefined, 'expense', categories)
      expect(sibs.map(c => c.id)).toEqual(['food'])
    })

    it('按类型过滤', () => {
      const sibs = siblingsOf(undefined, 'income', categories)
      expect(sibs.map(c => c.id)).toEqual(['salary'])
    })
  })

  describe('amountForCategory', () => {
    const txs: Transaction[] = [
      makeTx('1', 'expense', 20, 'breakfast'),
      makeTx('2', 'expense', 50, 'lunch'),
      makeTx('3', 'expense', 30, 'lunch-company'),
      makeTx('4', 'expense', 100, 'dinner'),
      makeTx('5', 'expense', 200, 'salary'),
      makeTx('6', 'income', 5000, 'salary')
    ]

    it('父分类汇总包含所有后代', () => {
      expect(amountForCategory(categories[0], categories, txs, 'expense')).toBe(20 + 50 + 30 + 100)
    })

    it('叶子分类只算自身', () => {
      expect(amountForCategory(categories[1], categories, txs, 'expense')).toBe(20)
    })

    it('按类型过滤', () => {
      const salary = categories.find(c => c.id === 'salary')!
      expect(amountForCategory(salary, categories, txs, 'income')).toBe(5000)
      expect(amountForCategory(salary, categories, txs, 'expense')).toBe(200)
    })
  })

  describe('countForCategory', () => {
    const txs: Transaction[] = [
      makeTx('1', 'expense', 20, 'breakfast'),
      makeTx('2', 'expense', 50, 'lunch'),
      makeTx('3', 'expense', 30, 'lunch'),
      makeTx('4', 'expense', 100, 'dinner')
    ]

    it('父分类计数包含后代', () => {
      const food = categories.find(c => c.id === 'food')!
      expect(countForCategory(food, categories, txs, 'expense')).toBe(4)
    })

    it('叶子分类只算自身', () => {
      const lunch = categories.find(c => c.id === 'lunch')!
      expect(countForCategory(lunch, categories, txs, 'expense')).toBe(2)
    })
  })

  describe('directParentAmount / directParentCount', () => {
    const txs: Transaction[] = [
      makeTx('1', 'expense', 20, 'lunch'),
      makeTx('2', 'expense', 50, 'lunch'),
      makeTx('3', 'expense', 30, 'lunch-company'),
      makeTx('4', 'expense', 100, 'breakfast')
    ]

    it('只计直接归属此分类的交易（不含后代）', () => {
      expect(directParentAmount('lunch', txs, 'expense')).toBe(70)
      expect(directParentCount('lunch', txs, 'expense')).toBe(2)
    })

    it('按类型过滤', () => {
      expect(directParentAmount('lunch', txs, 'income')).toBe(0)
      expect(directParentCount('lunch', txs, 'income')).toBe(0)
    })
  })

  describe('categoryById', () => {
    it('按 id 查找', () => {
      expect(categoryById(categories, 'food')?.id).toBe('food')
    })

    it('未传 id 返回 undefined', () => {
      expect(categoryById(categories, undefined)).toBeUndefined()
    })

    it('找不到返回 undefined', () => {
      expect(categoryById(categories, 'not-exist')).toBeUndefined()
    })
  })
})
