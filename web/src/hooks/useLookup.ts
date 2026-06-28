import { useEffect, useState } from 'react'
import { categoriesApi, accountsApi } from '../api/finflow'
import type { Category, Account } from '../db/models'

interface LookupState<T> {
  byId: Map<string, T>
  list: T[]
  loading: boolean
}

let categoriesCache: LookupState<Category> = { byId: new Map(), list: [], loading: true }
let accountsCache: LookupState<Account> = { byId: new Map(), list: [], loading: true }

const categoryListeners = new Set<() => void>()
const accountListeners = new Set<() => void>()

let categoriesPromise: Promise<void> | null = null
let accountsPromise: Promise<void> | null = null

function notify(set: Set<() => void>) {
  set.forEach(fn => fn())
}

async function loadCategories() {
  if (categoriesPromise) return categoriesPromise
  categoriesPromise = (async () => {
    try {
      const list = await categoriesApi.list()
      const byId = new Map<string, Category>()
      for (const c of list) byId.set(c.id, c)
      categoriesCache = { byId, list, loading: false }
    } catch (e) {
      categoriesCache = { byId: new Map(), list: [], loading: false }
    } finally {
      categoriesPromise = null
    }
    notify(categoryListeners)
  })()
  return categoriesPromise
}

async function loadAccounts() {
  if (accountsPromise) return accountsPromise
  accountsPromise = (async () => {
    try {
      const list = await accountsApi.list()
      const byId = new Map<string, Account>()
      for (const a of list) byId.set(a.id, a)
      accountsCache = { byId, list, loading: false }
    } catch (e) {
      accountsCache = { byId: new Map(), list: [], loading: false }
    } finally {
      accountsPromise = null
    }
    notify(accountListeners)
  })()
  return accountsPromise
}

export function useCategories(): LookupState<Category> {
  const [, force] = useState(0)
  useEffect(() => {
    if (categoriesCache.loading) loadCategories()
    const fn = () => force(x => x + 1)
    categoryListeners.add(fn)
    return () => { categoryListeners.delete(fn) }
  }, [])
  return categoriesCache
}

export function useAccounts(): LookupState<Account> {
  const [, force] = useState(0)
  useEffect(() => {
    if (accountsCache.loading) loadAccounts()
    const fn = () => force(x => x + 1)
    accountListeners.add(fn)
    return () => { accountListeners.delete(fn) }
  }, [])
  return accountsCache
}

export function refreshCategories() {
  categoriesCache = { byId: new Map(), list: [], loading: true }
  return loadCategories()
}

export function refreshAccounts() {
  accountsCache = { byId: new Map(), list: [], loading: true }
  return loadAccounts()
}

export function refreshAllLookups() {
  return Promise.all([refreshCategories(), refreshAccounts()])
}
