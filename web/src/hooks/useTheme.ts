import { useSyncExternalStore } from 'react'
import { getThemeMode, getEffectiveTheme, setThemeMode, subscribeTheme } from '../theme'

export function useTheme() {
  const mode = useSyncExternalStore(subscribeTheme, getThemeMode, () => 'auto')
  const effective = useSyncExternalStore(subscribeTheme, getEffectiveTheme, () => 'dark')
  return { mode, effective, setThemeMode }
}
