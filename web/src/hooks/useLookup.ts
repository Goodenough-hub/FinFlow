import { useEffect, useState } from 'react'
import { categoriesApi, accountsApi, tripsApi } from '../api/finflow'
import type { Category, Account, Trip } from '../db/models'

interface LookupState<T> {
  byId: Map<string, T>
  list: T[]
  loading: boolean
}

let categoriesCache: LookupState<Category> = { byId: new Map(), list: [], loading: true }
let accountsCache: LookupState<Account> = { byId: new Map(), list: [], loading: true }
let tripsCache: LookupState<Trip> = { byId: new Map(), list: [], loading: true }

const categoryListeners = new Set<() => void>()
const accountListeners = new Set<() => void>()
const tripListeners = new Set<() => void>()

let categoriesPromise: Promise<void> | null = null
let accountsPromise: Promise<void> | null = null
let tripsPromise: Promise<void> | null = null

function notify(set: Set<() => void>) {
  set.forEach(fn => fn())
}

async function loadCategories() {
  if (categoriesPromise) return categoriesPromise
  categoriesPromise = (async () => {
    try {
      const list = (await categoriesApi.list()).map(c => ({
        ...c,
        parentId: c.parentId ?? undefined,
      }))
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
      const rawList = await accountsApi.list()
      const list: Account[] = rawList.map(a => ({
        ...a,
        initialBalance: Number(a.initialBalance),
        parentId: a.parentId ?? undefined,
      }))
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
    // 初次加载 or 失败后空列表自动重试
    if ((categoriesCache.loading || categoriesCache.list.length === 0) && !categoriesPromise) {
      loadCategories()
    }
    const fn = () => force(x => x + 1)
    categoryListeners.add(fn)
    return () => { categoryListeners.delete(fn) }
  }, [])
  return categoriesCache
}

export function useAccounts(): LookupState<Account> {
  const [, force] = useState(0)
  useEffect(() => {
    if ((accountsCache.loading || accountsCache.list.length === 0) && !accountsPromise) {
      loadAccounts()
    }
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

async function loadTrips() {
  if (tripsPromise) return tripsPromise
  tripsPromise = (async () => {
    try {
      const list = await tripsApi.list()
      const byId = new Map<string, Trip>()
      for (const t of list) byId.set(t.id, t)
      tripsCache = { byId, list, loading: false }
    } catch (e) {
      tripsCache = { byId: new Map(), list: [], loading: false }
    } finally {
      tripsPromise = null
    }
    notify(tripListeners)
  })()
  return tripsPromise
}

export function useTrips(): LookupState<Trip> {
  const [, force] = useState(0)
  useEffect(() => {
    if ((tripsCache.loading || tripsCache.list.length === 0) && !tripsPromise) {
      loadTrips()
    }
    const fn = () => force(x => x + 1)
    tripListeners.add(fn)
    return () => { tripListeners.delete(fn) }
  }, [])
  return tripsCache
}

export function refreshTrips() {
  tripsCache = { byId: new Map(), list: [], loading: true }
  return loadTrips()
}

export function refreshAllLookups() {
  return Promise.all([refreshCategories(), refreshAccounts(), refreshTrips()])
}
