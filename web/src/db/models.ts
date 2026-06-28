export type TransactionType = 'income' | 'expense' | 'transfer'
export type CategoryType = 'income' | 'expense'
export type AccountType = 'alipay' | 'wechat' | 'unionpay' | 'visa' | 'bank' | 'fixed' | 'transit' | 'other'

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
  parentId?: string
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
export const ACCOUNT_TYPES: AccountType[] = ['alipay', 'wechat', 'unionpay', 'visa', 'bank', 'fixed', 'transit', 'other']

export const typeLabel: Record<TransactionType, string> = {
  income: '收入',
  expense: '支出',
  transfer: '转账'
}

export const accountTypeLabel: Record<AccountType, string> = {
  alipay: '支付宝',
  wechat: '微信',
  unionpay: '云闪付',
  visa: 'Visa / 万事达',
  bank: '银行卡',
  fixed: '定期',
  transit: '交通卡',
  other: '其他'
}

export const accountTypeIcon: Record<AccountType, string> = {
  alipay: '支',
  wechat: '微',
  unionpay: '银',
  visa: 'V',
  bank: '行',
  fixed: '定',
  transit: '交',
  other: '卡'
}

export const accountTypeColor: Record<AccountType, string> = {
  alipay: '#1677FF',
  wechat: '#07C160',
  unionpay: '#E60012',
  visa: '#1A1F71',
  bank: '#6B7280',
  fixed: '#F59E0B',
  transit: '#8B5CF6',
  other: '#6B7280'
}

export interface BankPreset {
  code: string
  name: string
  abbr: string
  colorHex: string
}

export const BANK_PRESETS: BankPreset[] = [
  { code: 'cmb', name: '招商银行', abbr: 'CMB', colorHex: '#C8161D' },
  { code: 'icbc', name: '工商银行', abbr: '工', colorHex: '#C7000B' },
  { code: 'ccb', name: '建设银行', abbr: '建', colorHex: '#0066B3' },
  { code: 'abc', name: '农业银行', abbr: '农', colorHex: '#009580' },
  { code: 'boc', name: '中国银行', abbr: '中', colorHex: '#AE0000' },
  { code: 'bcm', name: '交通银行', abbr: '交', colorHex: '#0B3B8C' },
  { code: 'psbc', name: '邮储银行', abbr: '邮', colorHex: '#007F4D' },
  { code: 'citic', name: '中信银行', abbr: '信', colorHex: '#003D7C' },
  { code: 'ceb', name: '光大银行', abbr: '光', colorHex: '#6B0B7C' },
  { code: 'cmbc', name: '民生银行', abbr: '民', colorHex: '#003B6F' },
  { code: 'cib', name: '兴业银行', abbr: '兴', colorHex: '#003D7C' },
  { code: 'spdb', name: '浦发银行', abbr: '浦', colorHex: '#7B1FA2' },
  { code: 'pab', name: '平安银行', abbr: '安', colorHex: '#F47B20' },
  { code: 'hxb', name: '华夏银行', abbr: '华', colorHex: '#D6002A' }
]

export const ACCOUNT_SUBTYPE_PRESETS: Record<'alipay' | 'wechat', string[]> = {
  alipay: ['余额', '余额宝', '理财'],
  wechat: ['零钱', '零钱通', '理财通']
}
