// "隐藏金额"开关：资产页与我的页共用同一份状态。
// 存 localStorage 而非组件 state：页面切走会卸载组件，state 随之丢失，回来又露出金额。
// 内存里另存一份并通知订阅者，保证同时挂载的多个开关即时同步。
const HIDE_AMOUNT_KEY = 'finflow.web.hide-amount'

const listeners = new Set<() => void>()
let hideAmount = loadHideAmount()

function loadHideAmount(): boolean {
  try {
    return localStorage.getItem(HIDE_AMOUNT_KEY) === '1'
  } catch {
    return false
  }
}

export function getHideAmount(): boolean {
  return hideAmount
}

export function setHideAmount(hide: boolean): void {
  if (hide === hideAmount) return
  hideAmount = hide
  try {
    if (hide) localStorage.setItem(HIDE_AMOUNT_KEY, '1')
    else localStorage.removeItem(HIDE_AMOUNT_KEY)
  } catch {
    // 隐私模式等存储不可用时只影响持久化，不影响当前会话内的切换
  }
  for (const l of listeners) l()
}

export function subscribeHideAmount(listener: () => void): () => void {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}
