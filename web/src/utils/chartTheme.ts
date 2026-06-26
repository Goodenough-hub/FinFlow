let cache: Map<string, string> | null = null
let cachedTheme = ''

function readVars(): Map<string, string> {
  const styles = getComputedStyle(document.documentElement)
  const map = new Map<string, string>()
  const keys = [
    '--chart-tooltip-bg',
    '--chart-tooltip-border',
    '--chart-text',
    '--chart-text-muted',
    '--chart-axis',
    '--chart-grid',
    '--income-green',
    '--expense-gold',
    '--accent-blue',
    '--transfer-blue',
    '--overspend-red',
    '--text-primary',
    '--bg-card-elevated'
  ]
  for (const k of keys) {
    map.set(k, styles.getPropertyValue(k).trim())
  }
  return map
}

export function chartColors() {
  const currentTheme = document.documentElement.getAttribute('data-theme') ?? 'auto'
  const systemScheme = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
  const effective = currentTheme === 'auto' ? systemScheme : currentTheme
  if (!cache || cachedTheme !== effective) {
    cache = readVars()
    cachedTheme = effective
  }
  const c = cache
  return {
    tooltipBg: c.get('--chart-tooltip-bg') ?? 'rgba(26,26,30,0.95)',
    tooltipBorder: c.get('--chart-tooltip-border') ?? 'rgba(44,44,46,0.6)',
    text: c.get('--chart-text') ?? '#8E8E93',
    textMuted: c.get('--chart-text-muted') ?? '#636366',
    axis: c.get('--chart-axis') ?? 'rgba(44,44,46,0.6)',
    grid: c.get('--chart-grid') ?? 'rgba(44,44,46,0.5)',
    income: c.get('--income-green') ?? '#34D399',
    expense: c.get('--expense-gold') ?? '#F59E0B',
    accent: c.get('--accent-blue') ?? '#5B8DEF',
    transfer: c.get('--transfer-blue') ?? '#5B8DEF',
    overspend: c.get('--overspend-red') ?? '#EF4444',
    textPrimary: c.get('--text-primary') ?? '#fff',
    bgElevated: c.get('--bg-card-elevated') ?? '#222228'
  }
}

export function clearChartThemeCache() {
  cache = null
  cachedTheme = ''
}
