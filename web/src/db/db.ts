import Dexie, { Table } from 'dexie'
import type { Transaction, Category, Account, Budget, RecurringTransaction } from './models'

export class FinFlowDB extends Dexie {
  transactions!: Table<Transaction, string>
  categories!: Table<Category, string>
  accounts!: Table<Account, string>
  budgets!: Table<Budget, string>
  recurring!: Table<RecurringTransaction, string>

  constructor() {
    super('FinFlowDB')
    this.version(1).stores({
      transactions: 'id, type, date, categoryId, accountId, createdAt',
      categories: 'id, type, parentId, sortOrder, [type+parentId]',
      accounts: 'id, type, sortOrder',
      budgets: 'id, [year+month], categoryId',
      recurring: 'id, nextDate, frequency'
    })
  }
}

export const db = new FinFlowDB()

export const uid = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
