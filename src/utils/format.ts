export function asCurrency(n: number): string {
  if (!Number.isFinite(n)) n = 0
  const abs = Math.abs(n)
  const formatted = abs.toLocaleString('zh-CN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  })
  return `${n < 0 ? '-' : ''}¥${formatted}`
}

export function formatCompact(n: number): string {
  const abs = Math.abs(n)
  if (abs >= 10000) return `${(n / 10000).toFixed(1)}w`
  if (abs >= 1000) return `${(n / 1000).toFixed(1)}k`
  return `${Math.round(n)}`
}

export function formatPercent(n: number, digits = 1): string {
  return `${n.toFixed(digits)}%`
}
