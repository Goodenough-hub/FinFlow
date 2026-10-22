import { useMemo, useState } from 'react'
import ReactECharts from 'echarts-for-react'
import type { Transaction } from '../db/models'
import { aggregateTrend } from '../utils/stats'
import type { TrendMode } from '../utils/stats'
import { formatCompact } from '../utils/format'
import { chartColors, chartAnimationEnabled } from '../utils/chartTheme'
import { useTheme } from '../hooks/useTheme'
import './TrendChart.css'

interface Props {
  transactions: Transaction[]
}

const MODES: Array<{ key: TrendMode; label: string }> = [
  { key: 'month', label: '月' },
  { key: 'quarter', label: '季' },
  { key: 'year', label: '年' }
]

interface TooltipParam {
  axisValue: string
  seriesName: string
  value: number
}

export function formatTrendTooltip(params: TooltipParam[]): string {
  const title = params[0]?.axisValue ?? ''
  const lines = params
    .map(p => `${p.seriesName}: ¥${Number(p.value).toLocaleString('zh-CN', { maximumFractionDigits: 2 })}`)
    .join('<br/>')
  return `${title}<br/>${lines}`
}

export default function TrendChart({ transactions }: Props) {
  const { effective } = useTheme()
  const [mode, setMode] = useState<TrendMode>('month')

  const buckets = useMemo(
    () => aggregateTrend(transactions, mode, new Date()),
    [transactions, mode]
  )

  const option = useMemo(() => {
    const c = chartColors()
    return {
      animation: chartAnimationEnabled(),
      grid: { left: 44, right: 16, top: 32, bottom: 28 },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: c.tooltipBg,
        borderColor: c.tooltipBorder,
        borderWidth: 1,
        textStyle: { color: c.textPrimary, fontSize: 12 },
        formatter: (params: TooltipParam[]) => formatTrendTooltip(params)
      },
      legend: {
        data: ['收入', '支出', '结余'],
        top: 0,
        right: 0,
        itemWidth: 8,
        itemHeight: 8,
        icon: 'circle',
        textStyle: { color: c.text, fontSize: 11 }
      },
      xAxis: {
        type: 'category',
        data: buckets.map(b => b.label),
        axisLabel: { color: c.textMuted, fontSize: 10 },
        axisLine: { lineStyle: { color: c.axis } },
        axisTick: { show: false }
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          color: c.textMuted,
          fontSize: 10,
          formatter: (v: number) => formatCompact(v)
        },
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: c.grid, type: 'dashed' } }
      },
      series: [
        {
          name: '收入',
          type: 'bar',
          data: buckets.map(b => b.income),
          itemStyle: { color: c.income, borderRadius: [3, 3, 0, 0] },
          barMaxWidth: 20
        },
        {
          name: '支出',
          type: 'bar',
          data: buckets.map(b => b.expense),
          itemStyle: { color: c.expense, borderRadius: [3, 3, 0, 0] },
          barMaxWidth: 20
        },
        {
          name: '结余',
          type: 'line',
          data: buckets.map(b => b.income - b.expense),
          itemStyle: { color: c.accent },
          lineStyle: { width: 2 },
          symbol: 'circle',
          symbolSize: 5,
          smooth: true
        }
      ]
    }
  }, [buckets, effective])

  return (
    <div className="card trend-card">
      <div className="trend-header">
        <span className="trend-title">收支趋势</span>
        <div className="trend-mode-tab" role="tablist">
          {MODES.map(m => (
            <button
              key={m.key}
              role="tab"
              aria-selected={mode === m.key}
              className={mode === m.key ? 'active' : ''}
              onClick={() => setMode(m.key)}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>
      <ReactECharts
        option={option}
        style={{ height: 220 }}
        opts={{ renderer: 'svg' }}
        notMerge
        lazyUpdate
      />
    </div>
  )
}
