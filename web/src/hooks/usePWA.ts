import { useEffect, useState, useCallback, useRef, useSyncExternalStore } from 'react'
import { subscribeNeedRefresh, getNeedRefresh, applyUpdate, dismissUpdate } from '../services/pwa'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function usePWA() {
  const [offline, setOffline] = useState<boolean>(() => !navigator.onLine)
  const [canInstall, setCanInstall] = useState<boolean>(false)
  const [installed, setInstalled] = useState<boolean>(
    () => window.matchMedia('(display-mode: standalone)').matches
  )
  const installEventRef = useRef<BeforeInstallPromptEvent | null>(null)

  // SW 只在 services/pwa.ts 注册一次；这里只订阅「有新版本」状态，不再重复注册。
  const needRefresh = useSyncExternalStore(subscribeNeedRefresh, getNeedRefresh)

  useEffect(() => {
    const handleOnline = () => setOffline(false)
    const handleOffline = () => setOffline(true)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      installEventRef.current = e as BeforeInstallPromptEvent
      setCanInstall(true)
    }
    const installedHandler = () => {
      setInstalled(true)
      setCanInstall(false)
      installEventRef.current = null
    }
    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', installedHandler)
    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      window.removeEventListener('appinstalled', installedHandler)
    }
  }, [])

  const install = useCallback(async () => {
    const ev = installEventRef.current
    if (!ev) return false
    await ev.prompt()
    const choice = await ev.userChoice
    installEventRef.current = null
    setCanInstall(false)
    return choice.outcome === 'accepted'
  }, [])

  return {
    offline,
    canInstall,
    installed,
    needRefresh,
    install,
    update: applyUpdate,
    dismissUpdate
  }
}
