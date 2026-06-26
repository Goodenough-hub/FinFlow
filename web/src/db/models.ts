export type TransactionType = 'income' | 'expense' | 'transfer'
export type CategoryType = 'income' | 'expense'
export type AccountType = 'alipay' | 'wechat' | 'unionpay' | 'fixed' | 'transit' | 'other'

export interface Transaction {
  id: string
  amount: number
  type: TransactionType
  note: string
  date: string
  time?: string
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
  icon: string
  colorHex: string
  initialBalance: number
  sortOrder: number
  isSystem: boolean
  createdAt: string
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
  dayOfMonth?: number
  dayOfWeek?: number
  nextDate: string
  startDate: string
  endDate?: string
  isActive: boolean
  createdAt: string
}

export const TRANSACTION_TYPES: TransactionType[] = ['income', 'expense', 'transfer']
export const CATEGORY_TYPES: CategoryType[] = ['income', 'expense']
export const ACCOUNT_TYPES: AccountType[] = ['alipay', 'wechat', 'unionpay', 'fixed', 'transit', 'other']

export const typeLabel: Record<TransactionType, string> = {
  income: '收入',
  expense: '支出',
  transfer: '转账'
}

export const accountTypeLabel: Record<AccountType, string> = {
  alipay: '支付宝',
  wechat: '微信',
  unionpay: '云闪付',
  fixed: '定期',
  transit: '交通卡',
  other: '其他'
}

export const accountTypeIcon: Record<AccountType, string> = {
  alipay: '🅰️',
  wechat: '💬',
  unionpay: '🅒',
  fixed: '🔐',
  transit: '🚇',
  other: '💳'
}

export const accountTypeColor: Record<AccountType, string> = {
  alipay: '#1677FF',
  wechat: '#07C160',
  unionpay: '#E60012',
  fixed: '#F59E0B',
  transit: '#8B5CF6',
  other: '#6B7280'
}
