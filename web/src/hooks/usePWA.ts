import { useEffect, useState, useCallback, useRef } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

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

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker
  } = useRegisterSW({
    onRegisteredSW(url) {
      console.log('SW registered:', url)
    },
    onRegisterError(error) {
      console.error('SW registration failed:', error)
    }
  })

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

  const update = useCallback(async () => {
    await updateServiceWorker(true)
    setNeedRefresh(false)
  }, [updateServiceWorker, setNeedRefresh])

  const dismissUpdate = useCallback(() => {
    setNeedRefresh(false)
  }, [setNeedRefresh])

  return {
    offline,
    canInstall,
    installed,
    needRefresh,
    install,
    update,
    dismissUpdate
  }
}
