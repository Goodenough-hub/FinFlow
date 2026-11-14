import { registerSW } from 'virtual:pwa-register'

// Service Worker 的唯一注册点（main.tsx 启动时调用 initPWA）。
// registerType 为 'prompt'：新版本装好后停在 waiting，不会自己接管页面。
// - 用户还没碰过页面（冷启动刚打开）→ 直接应用并刷新，没有可丢的输入；
// - 用户已经在操作 → 只亮「发现新版本」提示，由用户决定何时刷新，
//   避免记一笔填到一半被静默 reload 丢掉。
// 曾经的错误：autoUpdate + main.tsx 与 usePWA 各注册一次，新版本激活即 reload，
// 提示条永远不出现。

export const UPDATE_CHECK_INTERVAL = 60 * 60 * 1000
// 回到前台触发检查的最小间隔，避免来回切 App 时频繁请求 sw.js
export const UPDATE_CHECK_MIN_GAP = 60 * 1000

type Listener = () => void

let needRefresh = false
let interacted = false
let initialized = false
let updateSW: ((reloadPage?: boolean) => Promise<void>) | undefined
const listeners = new Set<Listener>()

function setNeedRefresh(value: boolean) {
  if (needRefresh === value) return
  needRefresh = value
  for (const l of listeners) l()
}

export function subscribeNeedRefresh(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getNeedRefresh(): boolean {
  return needRefresh
}

export async function applyUpdate() {
  setNeedRefresh(false)
  await updateSW?.(true)
}

export function dismissUpdate() {
  setNeedRefresh(false)
}

// 主动探测新版本。离线或已有新 SW 在安装中时跳过；
// 先用 no-store 探一下 sw.js，服务器不可达时不调 update()（它失败会抛错）。
export async function checkForUpdate(swUrl: string, registration: ServiceWorkerRegistration) {
  if (registration.installing) return
  if ('onLine' in navigator && !navigator.onLine) return
  try {
    const resp = await fetch(swUrl, {
      cache: 'no-store',
      headers: { cache: 'no-store', 'cache-control': 'no-cache' }
    })
    if (resp.status === 200) await registration.update()
  } catch {
    // 网络抖动：下次再查
  }
}

function scheduleUpdateChecks(swUrl: string, registration: ServiceWorkerRegistration) {
  let lastCheck = Date.now()
  const check = () => {
    lastCheck = Date.now()
    void checkForUpdate(swUrl, registration)
  }
  setInterval(check, UPDATE_CHECK_INTERVAL)
  // iOS 主屏 PWA 多数时候是从后台恢复而不是冷启动，只靠定时器会很久都发现不了新版本
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && Date.now() - lastCheck >= UPDATE_CHECK_MIN_GAP) check()
  })
}

export function initPWA() {
  if (initialized) return
  initialized = true

  const markInteracted = () => {
    interacted = true
    window.removeEventListener('pointerdown', markInteracted, true)
    window.removeEventListener('keydown', markInteracted, true)
  }
  window.addEventListener('pointerdown', markInteracted, true)
  window.addEventListener('keydown', markInteracted, true)

  updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      if (interacted) setNeedRefresh(true)
      else void updateSW?.(true)
    },
    onRegisteredSW(swUrl, registration) {
      if (registration) scheduleUpdateChecks(swUrl, registration)
    },
    onRegisterError(error) {
      console.error('SW registration failed:', error)
    }
  })
}
