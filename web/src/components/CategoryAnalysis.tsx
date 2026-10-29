import { useMemo } from 'react'
import ReactECharts from 'echarts-for-react'
import type { Category, Transaction, TransactionType } from '../db/models'
import {
  amountForCategory,
  countForCategory,
  directParentAmount,
  directParentCount,
  siblingsOf
} from '../utils/category'
import { asCurrency, formatPercent } from '../utils/format'
import { chartColors, chartAnimationEnabled } from '../utils/chartTheme'
import { useTheme } from '../hooks/useTheme'
import { useCategories } from '../hooks/useLookup'
import CategoryIcon from './CategoryIcon'
import './CategoryAnalysis.css'

interface Props {
  transactions: Transaction[]
  type: TransactionType
  parentCategory?: Category
  onCategoryClick: (category: Category) => void
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
}

export default function CategoryAnalysis({ transactions, type, parentCategory, onCategoryClick }: Props) {
  const { list: allCategories = [] } = useCategories()
  useTheme()
  const currentParent = parentCategory

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
          name: '直接记入本分类',
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
        category: c
      }))
      .filter(r => r.amount > 0)
    if (currentParent) {
      const direct = directParentAmount(currentParent.id, transactions, type)
      if (direct > 0) {
        list.push({
          id: UNCATEGORIZED_ID,
          name: '直接记入本分类',
          color: '#636366',
          icon: '⋯',
          amount: direct,
          count: directParentCount(currentParent.id, transactions, type)
        })
      }
    }
    return list.sort((a, b) => b.amount - a.amount)
  }, [siblings, allCategories, transactions, type, currentParent])

  if (siblings.length === 0 && !currentParent) return null

  const typeLabel = type === 'income' ? '收入' : '支出'

  const c = chartColors()
  const pieOption = {
    animation: chartAnimationEnabled(),
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

  const percentage = (amount: number) => (total > 0 ? (amount / total) * 100 : 0)

  return (
    <div className="card category-card">
      <div className="category-header">
        <span className="category-section-title">{currentParent ? '子分类占比' : `${typeLabel}分类占比`}</span>
      </div>

      {total === 0 ? (
        <div className="category-empty">
          <div className="category-empty-icon">🥧</div>
          <div>本层级暂无交易</div>
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
            {items.map((item, idx) => {
              const clickable = !!item.category
              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={!clickable}
                  className={`breakdown-row ${clickable ? 'clickable' : ''}`}
                  onClick={() => item.category && onCategoryClick(item.category)}
                >
                  <CategoryIcon icon={item.icon} color={item.color} size={32} />
                  <span className="breakdown-content">
                    <span className="breakdown-top">
                      <span className="breakdown-name">{item.name}</span>
                      <span
                        className="breakdown-amount"
                        style={{ color: type === 'income' ? 'var(--income-green)' : 'var(--expense-gold)' }}
                      >
                        {asCurrency(item.amount)}
                      </span>
                    </span>
                    <span className="breakdown-meta">
                      {item.count} 笔 · {formatPercent(percentage(item.amount))}
                    </span>
                    <span className="breakdown-bar">
                      <span
                        className="breakdown-bar-fill"
                        style={{
                          width: `${percentage(item.amount)}%`,
                          background: item.color
                        }}
                      />
                    </span>
                  </span>
                  {clickable && <span className="breakdown-chevron">›</span>}
                  {idx < items.length - 1 && <span className="breakdown-divider" />}
                </button>
              )
            })}
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
