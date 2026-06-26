export type TransactionType = 'income' | 'expense' | 'transfer'
export type CategoryType = 'income' | 'expense'
export type AccountType = 'alipay' | 'wechat' | 'unionpay' | 'fixed' | 'other'

export interface Transaction {
  id: string
  amount: number
  type: TransactionType
  note: string
  date: string
  createdAt: string
  categoryId?: string
  accountId?: string
  toAccountId?: string
  sourceId?: string
  sourceType?: string
  vendor?: string
}

export interface Category {
  id: string
  name: string
  type: CategoryType
  icon: string
  colorHex: string
  sortOrder: number
  isSystem: boolean
  parentId?: string
}

export interface Account {
  id: string
  name: string
  type: AccountType
  sortOrder: number
  isSystem: boolean
}

export interface Budget {
  id: string
  amount: number
  month: number
  year: number
  categoryId: string
}

export interface RecurringTransaction {
  id: string
  amount: number
  type: TransactionType
  note: string
  categoryId?: string
  accountId?: string
  toAccountId?: string
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'
  interval: number
  nextDate: string
  startDate: string
  endDate?: string
  createdAt: string
}

export const TRANSACTION_TYPES: TransactionType[] = ['income', 'expense', 'transfer']
export const CATEGORY_TYPES: CategoryType[] = ['income', 'expense']
export const ACCOUNT_TYPES: AccountType[] = ['alipay', 'wechat', 'unionpay', 'fixed', 'other']

export const typeLabel: Record<TransactionType, string> = {
  income: '收入',
  expense: '支出',
  transfer: '转账'
}

export const accountTypeLabel: Record<AccountType, string> = {
  alipay: '支付宝',
  wechat: '微信',
  unionpay: '银行卡',
  fixed: '定期',
  other: '其他'
}
