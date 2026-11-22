// 资产页"隐藏金额"开关的持久化。
// 存 localStorage 而非组件 state：页面切走会卸载 AccountsPage，state 随之丢失，回来又露出金额。
const HIDE_AMOUNT_KEY = 'finflow.web.hide-amount'

export function loadHideAmount(): boolean {
  try {
    return localStorage.getItem(HIDE_AMOUNT_KEY) === '1'
  } catch {
    return false
  }
}

export function saveHideAmount(hide: boolean): void {
  try {
    if (hide) localStorage.setItem(HIDE_AMOUNT_KEY, '1')
    else localStorage.removeItem(HIDE_AMOUNT_KEY)
  } catch {
    // 隐私模式等存储不可用时只影响持久化，不影响当前页的切换
  }
}
