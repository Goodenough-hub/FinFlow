import { useMemo } from 'react'
import ReactECharts from 'echarts-for-react'
import type { Transaction } from '../db/models'
import type { StatPeriod } from '../utils/date'
import { daysInMonth, dayKey, monthKey } from '../utils/date'
import { formatCompact } from '../utils/format'
import './DailyBarChart.css'

interface Props {
  transactions: Transaction[]
  period: StatPeriod
  date: Date
}

interface Bucket {
  xValue: number
  income: number
  expense: number
}

export default function DailyBarChart({ transactions, period, date }: Props) {
  const buckets = useMemo<Bucket[]>(() => {
    if (period === 'month') {
      const dim = daysInMonth(date)
      const dict = new Map<number, Bucket>()
      for (let d = 1; d <= dim; d++) {
        dict.set(d, { xValue: d, income: 0, expense: 0 })
      }
      for (const t of transactions) {
        const d = dayKey(t.date)
        const b = dict.get(d)
        if (!b) continue
        if (t.type === 'income') b.income += t.amount
        else if (t.type === 'expense') b.expense += t.amount
      }
      return Array.from(dict.values())
    }
    const dict = new Map<number, Bucket>()
    for (let m = 1; m <= 12; m++) {
      dict.set(m, { xValue: m, income: 0, expense: 0 })
    }
    for (const t of transactions) {
      const m = monthKey(t.date)
      const b = dict.get(m)
      if (!b) continue
      if (t.type === 'income') b.income += t.amount
      else if (t.type === 'expense') b.expense += t.amount
    }
    return Array.from(dict.values())
  }, [transactions, period, date])

  const xValues = period === 'month' ? [1, 5, 10, 15, 20, 25, 30] : Array.from({ length: 12 }, (_, i) => i + 1)
  const xLabel = period === 'month' ? '日' : '月'

  const option = useMemo(() => ({
    grid: { left: 44, right: 16, top: 16, bottom: 28 },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: 'rgba(26, 26, 30, 0.95)',
      borderColor: 'rgba(44, 44, 46, 0.6)',
      borderWidth: 1,
      textStyle: { color: '#fff', fontSize: 12 },
      formatter: (params: Array<{ axisValue: number; seriesName: string; value: number }>) => {
        const title = `${xLabel} ${params[0]?.axisValue ?? ''}`
        const lines = params
          .map(p => `${p.seriesName}: ¥${p.value.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}`)
          .join('<br/>')
        return `${title}<br/>${lines}`
      }
    },
    legend: {
      data: ['收入', '支出'],
      top: 0,
      right: 0,
      itemWidth: 8,
      itemHeight: 8,
      icon: 'circle',
      textStyle: { color: '#8E8E93', fontSize: 11 }
    },
    xAxis: {
      type: 'value',
      min: period === 'month' ? 1 : 1,
      max: period === 'month' ? daysInMonth(date) : 12,
      interval: period === 'month' ? 1 : 1,
      axisLabel: {
        color: '#636366',
        fontSize: 10,
        formatter: (v: number) => (xValues.includes(v) ? String(v) : '')
      },
      axisLine: { lineStyle: { color: 'rgba(44, 44, 46, 0.6)' } },
      axisTick: { show: false },
      splitLine: { show: false }
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        color: '#636366',
        fontSize: 10,
        formatter: (v: number) => formatCompact(v)
      },
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: 'rgba(44, 44, 46, 0.5)', type: 'dashed' } }
    },
    series: [
      {
        name: '收入',
        type: 'bar',
        data: buckets.map(b => [b.xValue, b.income]),
        itemStyle: { color: '#34D399', borderRadius: [3, 3, 0, 0] },
        barWidth: '40%',
        barGap: '10%',
        animationDelay: (i: number) => i * 20
      },
      {
        name: '支出',
        type: 'bar',
        data: buckets.map(b => [b.xValue, b.expense]),
        itemStyle: { color: '#F59E0B', borderRadius: [3, 3, 0, 0] },
        barWidth: '40%',
        animationDelay: (i: number) => i * 20 + 100
      }
    ]
  }), [buckets, period, date, xValues, xLabel])

  const title = period === 'month' ? '月收支趋势' : '年收支趋势'
  const subtitle = `横：${xLabel}　纵：金额（¥）`

  return (
    <div className="card chart-card">
      <div className="chart-header">
        <div>
          <div className="chart-title">{title}</div>
          <div className="chart-subtitle">{subtitle}</div>
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
