import { clearChartThemeCache } from './utils/chartTheme'

const THEME_KEY = 'finflow.web.theme'
export type ThemeMode = 'dark' | 'light' | 'auto'

const listeners = new Set<() => void>()
let currentMode: ThemeMode = readInitialMode()
let systemScheme: 'light' | 'dark' = readSystemScheme()

function readInitialMode(): ThemeMode {
  if (typeof window === 'undefined') return 'auto'
  return (localStorage.getItem(THEME_KEY) as ThemeMode) || 'auto'
}

function readSystemScheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'dark'
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

function applyTheme(mode: ThemeMode) {
  const root = document.documentElement
  if (mode === 'auto') {
    root.removeAttribute('data-theme')
  } else {
    root.setAttribute('data-theme', mode)
  }
}

function notify() {
  for (const l of listeners) l()
}

export function getThemeMode(): ThemeMode {
  return currentMode
}

export function getEffectiveTheme(): 'light' | 'dark' {
  return currentMode === 'auto' ? systemScheme : currentMode
}

export function setThemeMode(mode: ThemeMode) {
  if (mode === currentMode) return
  currentMode = mode
  localStorage.setItem(THEME_KEY, mode)
  applyTheme(mode)
  clearChartThemeCache()
  notify()
}

export function subscribeTheme(listener: () => void): () => void {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

if (typeof window !== 'undefined') {
  applyTheme(currentMode)
  window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', e => {
    const next = e.matches ? 'light' : 'dark'
    if (next === systemScheme) return
    systemScheme = next
    clearChartThemeCache()
    if (currentMode === 'auto') notify()
  })
}
