// 生成唯一 id。crypto.randomUUID() 仅在安全上下文（HTTPS/localhost）可用，
// 线上为纯 HTTP 时它是 undefined，直接调用会抛 TypeError——故不可用时回退。
export const uid = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
