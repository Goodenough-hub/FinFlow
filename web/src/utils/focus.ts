// 判断焦点目标是否是「会唤起原生键盘/选择器」的表单控件。
// 记一笔页据此决定何时隐藏自定义数字键盘：textarea 与非只读 input（含
// 日期/时间）获得焦点时自定义键盘让位；金额输入框是 readOnly 的展示框
// （由 NumericKeypad 驱动），不在此列。
// 用鸭子类型而非 instanceof，方便在 node 测试环境用普通对象断言。
export function isTextEntryTarget(t: unknown): boolean {
  const el = t as { tagName?: unknown; readOnly?: unknown } | null
  if (!el || typeof el.tagName !== 'string') return false
  if (el.tagName === 'TEXTAREA') return true
  if (el.tagName === 'INPUT') return el.readOnly !== true
  return false
}
