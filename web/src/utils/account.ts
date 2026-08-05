import type { Account } from '../db/models'

export function getChildrenMap(accounts: Account[]): Map<string, Account[]> {
  const m = new Map<string, Account[]>()
  for (const a of accounts) {
    if (!a.parentId) continue
    const arr = m.get(a.parentId) ?? []
    arr.push(a)
    m.set(a.parentId, arr)
  }
  return m
}

export function isLeafAccount(acc: Account, childrenMap: Map<string, Account[]>): boolean {
  if (acc.parentId) return true
  return !childrenMap.has(acc.id)
}

export function getLeafAccounts(accounts: Account[]): Account[] {
  const childrenMap = getChildrenMap(accounts)
  return accounts.filter(a => isLeafAccount(a, childrenMap))
}

export function reverseInitialBalance(
  oldInitialBalance: number,
  oldDisplayBalance: number,
  newDisplayBalance: number
): number {
  return oldInitialBalance + (newDisplayBalance - oldDisplayBalance)
}

export function accountDisplayBalance(
  accountId: string,
  childrenMap: Map<string, Account[]>,
  ownBalances: Map<string, number>
): number {
  const own = ownBalances.get(accountId) ?? 0
  const kids = childrenMap.get(accountId) ?? []
  return own + kids.reduce((s, k) => s + (ownBalances.get(k.id) ?? 0), 0)
}
