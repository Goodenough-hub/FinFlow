import { useMemo, useState } from 'react'
import ReactECharts from 'echarts-for-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import type { Category, Transaction, TransactionType } from '../db/models'
import {
  amountForCategory,
  countForCategory,
  directParentAmount,
  directParentCount,
  hasChildren,
  siblingsOf
} from '../utils/category'
import { asCurrency, formatPercent } from '../utils/format'
import { chartColors } from '../utils/chartTheme'
import { useTheme } from '../hooks/useTheme'
import CategoryIcon from './CategoryIcon'
import './CategoryAnalysis.css'

interface Props {
  transactions: Transaction[]
  type: TransactionType
}

const UNCATEGORIZED_ID = '__uncategorized__'

interface Slice {
  id: string
  name: string
  color: string
  amount: number
  category?: Category
}

interface RowItem {
  id: string
  name: string
  color: string
  icon: string
  amount: number
  count: number
  category?: Category
  drillable: boolean
}

export default function CategoryAnalysis({ transactions, type }: Props) {
  const allCategories = useLiveQuery(() => db.categories.toArray(), [], [] as Category[])
  useTheme()
  const [drillPath, setDrillPath] = useState<Category[]>([])

  const currentParent = drillPath[drillPath.length - 1]

  const siblings = useMemo(
    () => siblingsOf(currentParent?.id, type, allCategories),
    [allCategories, currentParent, type]
  )

  const total = useMemo(() => {
    const subTotal = siblings.reduce((sum, c) => sum + amountForCategory(c, allCategories, transactions, type), 0)
    return subTotal + (currentParent ? directParentAmount(currentParent.id, transactions, type) : 0)
  }, [siblings, allCategories, transactions, type, currentParent])

  const slices = useMemo<Slice[]>(() => {
    const list: Slice[] = siblings
      .map(c => ({
        id: c.id,
        name: c.name,
        color: c.colorHex,
        amount: amountForCategory(c, allCategories, transactions, type),
        category: c
      }))
      .filter(s => s.amount > 0)
    if (currentParent) {
      const direct = directParentAmount(currentParent.id, transactions, type)
      if (direct > 0) {
        list.push({
          id: UNCATEGORIZED_ID,
          name: '未分类',
          color: '#636366',
          amount: direct
        })
      }
    }
    return list.sort((a, b) => b.amount - a.amount)
  }, [siblings, allCategories, transactions, type, currentParent])

  const items = useMemo<RowItem[]>(() => {
    const list: RowItem[] = siblings
      .map(c => ({
        id: c.id,
        name: c.name,
        color: c.colorHex,
        icon: c.icon,
        amount: amountForCategory(c, allCategories, transactions, type),
        count: countForCategory(c, allCategories, transactions, type),
        category: c,
        drillable: hasChildren(c.id, allCategories)
      }))
      .filter(r => r.amount > 0)
    if (currentParent) {
      const direct = directParentAmount(currentParent.id, transactions, type)
      if (direct > 0) {
        list.push({
          id: UNCATEGORIZED_ID,
          name: '未分类',
          color: '#636366',
          icon: '⋯',
          amount: direct,
          count: directParentCount(currentParent.id, transactions, type),
          drillable: false
        })
      }
    }
    return list.sort((a, b) => b.amount - a.amount)
  }, [siblings, allCategories, transactions, type, currentParent])

  if (siblings.length === 0 && drillPath.length === 0) return null

  const typeLabel = type === 'income' ? '收入' : '支出'

  const c = chartColors()
  const pieOption = {
    tooltip: {
      trigger: 'item',
      backgroundColor: c.tooltipBg,
      borderColor: c.tooltipBorder,
      borderWidth: 1,
      textStyle: { color: c.textPrimary, fontSize: 12 },
      formatter: (p: { name: string; value: number; percent: number }) =>
        `${p.name}<br/>¥${p.value.toLocaleString('zh-CN', { maximumFractionDigits: 2 })} (${p.percent}%)`
    },
    series: [
      {
        type: 'pie',
        radius: ['58%', '92%'],
        center: ['50%', '50%'],
        avoidLabelOverlap: true,
        itemStyle: { borderColor: c.bgElevated, borderWidth: 2, borderRadius: 4 },
        label: {
          show: true,
          position: 'inside',
          color: c.textPrimary,
          fontSize: 10,
          fontWeight: 500,
          formatter: (p: { name: string; percent: number }) =>
            p.percent >= 5 ? `${p.name}\n${p.percent.toFixed(0)}%` : ''
        },
        labelLine: { show: false },
        data: slices.map(s => ({ name: s.name, value: s.amount, itemStyle: { color: s.color } }))
      }
    ]
  }

  const onRowClick = (item: RowItem) => {
    if (!item.drillable || !item.category) return
    setDrillPath(prev => [...prev, item.category!])
  }

  const onBreadcrumbClick = (idx: number) => {
    setDrillPath(prev => (idx === -1 ? [] : prev.slice(0, idx + 1)))
  }

  const percentage = (amount: number) => (total > 0 ? (amount / total) * 100 : 0)

  return (
    <div className="card category-card">
      <div className="category-header">
        <span className="category-section-title">{typeLabel}分类占比</span>
      </div>

      <div className="breadcrumb">
        <button
          className={`crumb ${drillPath.length === 0 ? 'active' : ''}`}
          onClick={() => onBreadcrumbClick(-1)}
          disabled={drillPath.length === 0}
        >
          📊 <span>全部</span>
        </button>
        {drillPath.map((cat, idx) => {
          const isLast = idx === drillPath.length - 1
          return (
            <span key={cat.id} className="crumb-wrap">
              <span className="crumb-sep">›</span>
              <button
                className={`crumb ${isLast ? 'active' : ''}`}
                onClick={() => onBreadcrumbClick(idx)}
              >
                {cat.name}
              </button>
            </span>
          )
        })}
      </div>

      {total === 0 ? (
        <div className="category-empty">
          <div className="category-empty-icon">🥧</div>
          <div>本层级暂无交易</div>
          {drillPath.length > 0 && (
            <button className="back-btn" onClick={() => onBreadcrumbClick(drillPath.length - 2)}>
              返回上一层
            </button>
          )}
        </div>
      ) : (
        <>
          <ReactECharts
            option={pieOption}
            style={{ height: 200 }}
            opts={{ renderer: 'svg' }}
            notMerge
            lazyUpdate
          />
          <div className="breakdown-list">
            {items.map((item, idx) => (
              <div
                key={item.id}
                className={`breakdown-row ${item.drillable ? 'clickable' : ''}`}
                onClick={() => onRowClick(item)}
              >
                <CategoryIcon icon={item.icon} color={item.color} size={32} />
                <div className="breakdown-content">
                  <div className="breakdown-top">
                    <span className="breakdown-name">{item.name}</span>
                    <span
                      className="breakdown-amount"
                      style={{ color: type === 'income' ? 'var(--income-green)' : 'var(--expense-gold)' }}
                    >
                      {asCurrency(item.amount)}
                    </span>
                  </div>
                  <div className="breakdown-meta">
                    {item.count} 笔 · {formatPercent(percentage(item.amount))}
                  </div>
                  <div className="breakdown-bar">
                    <div
                      className="breakdown-bar-fill"
                      style={{
                        width: `${percentage(item.amount)}%`,
                        background: item.color
                      }}
                    />
                  </div>
                </div>
                {item.drillable && <span className="breakdown-chevron">›</span>}
                {idx < items.length - 1 && <div className="breakdown-divider" />}
              </div>
            ))}
          </div>
          <div className="category-total">
            <span className="total-label">合计</span>
            <span className="total-amount">{asCurrency(total)}</span>
          </div>
        </>
      )}
    </div>
  )
}
