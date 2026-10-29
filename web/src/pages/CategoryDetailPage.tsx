import { useMemo } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { transactionsApi } from '../api/finflow'
import { useCategories } from '../hooks/useLookup'
import { useQuery } from '../hooks/useQuery'
import { usePageScrollRestoration } from '../hooks/usePageScrollRestoration'
import { analysisPeriodParams, readAnalysisPeriod } from '../utils/analysisPeriod'
import { filterByPeriod, monthYearString, yearString } from '../utils/date'
import { hasChildren, transactionsForCategory } from '../utils/category'
import { compareTransactionsByDateTimeDesc } from '../utils/transaction'
import { asCurrency } from '../utils/format'
import CategoryAnalysis from '../components/CategoryAnalysis'
import CategoryIcon from '../components/CategoryIcon'
import EmptyState from '../components/EmptyState'
import TransactionRow from '../components/TransactionRow'
import './CategoryDetailPage.css'

export default function CategoryDetailPage() {
  const { id = '' } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { period, date } = useMemo(() => readAnalysisPeriod(params), [params])
  const { list: categories, byId, loading: categoriesLoading } = useCategories()
  const { data: transactions = [], loading, error, reload } = useQuery(() => transactionsApi.list(), [])
  const category = byId.get(id)
  const periodLabel = period === 'month' ? monthYearString(date) : yearString(date)
  const typeLabel = category?.type === 'income' ? '收入' : '支出'

  const items = useMemo(() => category
    ? transactionsForCategory(category.id, categories, filterByPeriod(transactions, period, date), category.type)
      .sort(compareTransactionsByDateTimeDesc)
    : [], [category, categories, transactions, period, date])
  const amount = items.reduce((sum, t) => sum + t.amount, 0)
  const includesChildren = category && hasChildren(category.id, categories)

  const categoryPath = useMemo(() => {
    const names: string[] = []
    const visited = new Set<string>()
    let current = category
    while (current && !visited.has(current.id)) {
      visited.add(current.id)
      names.unshift(current.name)
      current = current.parentId ? byId.get(current.parentId) : undefined
    }
    return names.join(' / ')
  }, [category, byId])

  usePageScrollRestoration(!loading && !categoriesLoading)

  const goBack = () => {
    if (location.state?.analysisFrom) navigate(-1)
    else {
      const homeParams = analysisPeriodParams(period, date)
      homeParams.set('type', category?.type ?? 'expense')
      navigate(`/?${homeParams}`, { replace: true })
    }
  }

  return (
    <div className="category-detail-page">
      <header className="category-detail-header">
        <button className="category-detail-back" onClick={goBack} aria-label="返回统计">
          <ChevronLeft size={20} />返回
        </button>
        <h1>分类明细</h1>
        <span className="category-detail-header-spacer" />
      </header>
      <main className="page category-detail-content">
        {loading || categoriesLoading ? (
          <div className="card category-detail-status" role="status">正在加载分类明细…</div>
        ) : error ? (
          <div className="card category-detail-status" role="alert">
            <p>明细加载失败，请重试</p>
            <button onClick={reload}>重新加载</button>
          </div>
        ) : !category ? (
          <div className="card"><EmptyState icon="🏷️" title="分类不存在或已删除" subtitle="返回统计查看其他分类" /></div>
        ) : (
          <>
            <section className="card category-detail-summary" aria-label="分类汇总">
              <div className="category-detail-identity">
                <CategoryIcon icon={category.icon} color={category.colorHex} size={44} />
                <div>
                  <h2>{periodLabel} · {category.name}{typeLabel}</h2>
                  <p className="category-detail-path">{categoryPath}</p>
                </div>
              </div>
              <div className={`category-detail-amount ${category.type}`}>{asCurrency(amount)}</div>
              <p className="category-detail-meta">{items.length} 笔交易{includesChildren ? ' · 包含所有子分类' : ''}</p>
            </section>

            {includesChildren && (
              <CategoryAnalysis
                transactions={items}
                type={category.type}
                parentCategory={category}
                onCategoryClick={child => navigate(
                  `/analysis/categories/${encodeURIComponent(child.id)}?${analysisPeriodParams(period, date)}`,
                  { state: { analysisFrom: true } }
                )}
              />
            )}

            <section className="category-detail-transactions" aria-label="交易明细">
              <div className="category-detail-list-header">
                <h2>{includesChildren ? '全部交易明细' : '交易明细'}</h2>
                <span>{items.length} 笔</span>
              </div>
              <div className="card category-detail-list">
                {items.length === 0 ? (
                  <EmptyState icon="📋" title="本周期暂无交易" subtitle="该分类在所选周期内没有记录" />
                ) : items.map(t => (
                  <button
                    key={t.id}
                    className="category-detail-transaction"
                    onClick={() => navigate(`/transactions/${t.id}`)}
                    aria-label={`查看交易：${t.note || category.name}`}
                  >
                    <TransactionRow transaction={t} showDate />
                  </button>
                ))}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  )
}
