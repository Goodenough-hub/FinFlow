import { apiClient } from './client'
import type {
  Transaction,
  Category,
  Account,
  Budget,
  RecurringTransaction
} from '../db/models'

export interface ListTxParams {
  startDate?: string
  endDate?: string
  type?: string
  categoryId?: string
  accountId?: string
  keyword?: string
  pageSize?: number
  offset?: number
}

export interface SummaryParams {
  startDate?: string
  endDate?: string
}

export interface CategoryBreakdownParams {
  type?: string
  startDate?: string
  endDate?: string
}

export interface Summary {
  income: number
  expense: number
  net: number
}

export interface CategoryBreakdownItem {
  categoryId: string
  type: string
  total: number
  count: number
}

export interface DailyTrendItem {
  date: string
  income: number
  expense: number
}

const BUDGET_FIELDS: (keyof Budget)[] = ['id', 'amount', 'month', 'year', 'categoryId']

function stripExtra<T extends Record<string, any>>(obj: T, allowed: (keyof T)[]): Partial<T> {
  const out: any = {}
  for (const k of allowed) {
    if (obj[k] !== undefined) out[k] = obj[k]
  }
  return out
}

export const transactionsApi = {
  list: (params?: ListTxParams) =>
    apiClient.get<Transaction[]>('/finflow/transactions', { params }).then(r => r.data),
  get: (id: string) =>
    apiClient.get<Transaction>(`/finflow/transactions/${id}`).then(r => r.data),
  create: (t: Omit<Transaction, 'id' | 'createdAt'>) =>
    apiClient.post<Transaction>('/finflow/transactions', t).then(r => r.data),
  update: (id: string, t: Partial<Transaction>) =>
    apiClient.put<Transaction>(`/finflow/transactions/${id}`, t).then(r => r.data),
  remove: (id: string) =>
    apiClient.delete(`/finflow/transactions/${id}`).then(r => r.data)
}

export const categoriesApi = {
  list: () =>
    apiClient.get<Category[]>('/finflow/categories').then(r => r.data),
  create: (c: Omit<Category, 'id'>) =>
    apiClient.post<Category>('/finflow/categories', c).then(r => r.data),
  update: (id: string, c: Partial<Category>) =>
    apiClient.put<Category>(`/finflow/categories/${id}`, c).then(r => r.data),
  remove: (id: string) =>
    apiClient.delete(`/finflow/categories/${id}`).then(r => r.data)
}

export const accountsApi = {
  list: () =>
    apiClient.get<Account[]>('/finflow/accounts').then(r => r.data),
  create: (a: Omit<Account, 'id' | 'createdAt'>) =>
    apiClient.post<Account>('/finflow/accounts', a).then(r => r.data),
  update: (id: string, a: Partial<Account>) =>
    apiClient.put<Account>(`/finflow/accounts/${id}`, a).then(r => r.data),
  remove: (id: string) =>
    apiClient.delete(`/finflow/accounts/${id}`).then(r => r.data),
  clear: () =>
    apiClient.delete('/finflow/accounts').then(r => r.data)
}

export const budgetsApi = {
  list: (year: number, month: number) =>
    apiClient.get<Budget[]>('/finflow/budgets', { params: { year, month } }).then(r => r.data),
  upsert: (b: Budget) =>
    apiClient.post<Budget>('/finflow/budgets', stripExtra(b, BUDGET_FIELDS)).then(r => r.data),
  remove: (id: string) =>
    apiClient.delete(`/finflow/budgets/${id}`).then(r => r.data)
}

export const recurringApi = {
  list: () =>
    apiClient.get<RecurringTransaction[]>('/finflow/recurring').then(r => r.data),
  create: (r: Omit<RecurringTransaction, 'id' | 'createdAt'>) =>
    apiClient.post<RecurringTransaction>('/finflow/recurring', r).then(r => r.data),
  update: (id: string, r: Partial<RecurringTransaction>) =>
    apiClient.put<RecurringTransaction>(`/finflow/recurring/${id}`, r).then(r => r.data),
  remove: (id: string) =>
    apiClient.delete(`/finflow/recurring/${id}`).then(r => r.data),
  process: () =>
    apiClient.post('/finflow/recurring/process').then(r => r.data)
}

export const statsApi = {
  summary: (params?: SummaryParams) =>
    apiClient.get<Summary>('/finflow/stats/summary', { params }).then(r => r.data),
  categoryBreakdown: (params?: CategoryBreakdownParams) =>
    apiClient.get<CategoryBreakdownItem[]>('/finflow/stats/category-breakdown', { params }).then(r => r.data),
  dailyTrend: (params?: SummaryParams) =>
    apiClient.get<DailyTrendItem[]>('/finflow/stats/daily-trend', { params }).then(r => r.data)
}
