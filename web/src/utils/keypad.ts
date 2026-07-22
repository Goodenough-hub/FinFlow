// 数字键盘的纯输入逻辑：把一次按键作用到当前金额字符串上，返回新字符串。
// 抽成纯函数便于单测；NumericKeypad 组件只负责渲染与调用。
// key 取值：'0'-'9' | '.' | 'back'（退格）| 'clear'（清零）
const MAX_INT_DIGITS = 8 // 小数点前最多位数，防超长
const MAX_DECIMALS = 2

export function applyKeypadKey(current: string, key: string): string {
  if (key === 'clear') return ''
  if (key === 'back') return current.slice(0, -1)

  if (key === '.') {
    if (current.includes('.')) return current
    if (current === '') return '0.'
    return current + '.'
  }

  if (!/^[0-9]$/.test(key)) return current // 非法键，忽略

  const dot = current.indexOf('.')
  // 已有 MAX_DECIMALS 位小数，忽略后续数字
  if (dot >= 0 && current.length - dot - 1 >= MAX_DECIMALS) return current
  // 前导 0：单独的 "0" 后按数字应替换（避免 "00"、"07"）
  if (current === '0') return key === '0' ? '0' : key
  // 整数位上限
  if (dot < 0 && current.length >= MAX_INT_DIGITS) return current

  return current + key
}
