import type { Category, Transaction, TransactionType } from '../db/models'

export function collectDescendantIds(categoryId: string, all: Category[]): Set<string> {
  const result = new Set<string>()
  const stack = [categoryId]
  while (stack.length) {
    const current = stack.pop()!
    for (const c of all) {
      if (c.parentId === current && !result.has(c.id)) {
        result.add(c.id)
        stack.push(c.id)
      }
    }
  }
  return result
}

export function hasChildren(categoryId: string, all: Category[]): boolean {
  return all.some(c => c.parentId === categoryId)
}

export function siblingsOf(parentId: string | undefined, type: TransactionType, all: Category[]): Category[] {
  return all
    .filter(c => c.type === type && c.parentId === parentId)
    .sort((a, b) => a.sortOrder - b.sortOrder)
}

export function amountForCategory(
  cat: Category,
  all: Category[],
  transactions: Transaction[],
  type: TransactionType
): number {
  return transactionsForCategory(cat.id, all, transactions, type)
    .reduce((sum, t) => sum + t.amount, 0)
}

export function transactionsForCategory(
  categoryId: string,
  all: Category[],
  transactions: Transaction[],
  type: TransactionType
): Transaction[] {
  const ids = collectDescendantIds(categoryId, all)
  ids.add(categoryId)
  return transactions.filter(t => t.type === type && t.categoryId != null && ids.has(t.categoryId))
}

export function countForCategory(
  cat: Category,
  all: Category[],
  transactions: Transaction[],
  type: TransactionType
): number {
  return transactionsForCategory(cat.id, all, transactions, type).length
}

export function directParentAmount(
  parentId: string,
  transactions: Transaction[],
  type: TransactionType
): number {
  return transactions
    .filter(t => t.type === type && t.categoryId === parentId)
    .reduce((sum, t) => sum + t.amount, 0)
}

export function directParentCount(
  parentId: string,
  transactions: Transaction[],
  type: TransactionType
): number {
  return transactions.filter(t => t.type === type && t.categoryId === parentId).length
}

export function categoryById(all: Category[], id?: string): Category | undefined {
  if (!id) return undefined
  return all.find(c => c.id === id)
}
