import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router-dom'
import { db, uid } from '../db/db'
import type { Category, CategoryType, Transaction } from '../db/models'
import CategoryIcon from '../components/CategoryIcon'
import './CategoriesPage.css'

type DialogState =
  | { mode: 'closed' }
  | { mode: 'new'; parentId?: string }
  | { mode: 'edit'; category: Category }

const PRESET_COLORS = [
  '#5B8DEF', '#34D399', '#F59E0B', '#EF4444',
  '#8B5CF6', '#EC4899', '#06B6D4', '#6B7280',
  '#FF6B35', '#10B981', '#F97316', '#6366F1'
]

const PRESET_ICONS = [
  '🍴','🚗','🛍️','🏠','🎮','⚕️','📚','💰',
  '📈','💼','✈️','🎬','🎵','🏃','☕','🍺',
  '🛒','💊','🎓','💳','🎁','✨','📱','💻'
]

export default function CategoriesPage() {
  const navigate = useNavigate()
  const allCategories = useLiveQuery(() => db.categories.toArray(), [], [] as Category[])
  const allTransactions = useLiveQuery(() => db.transactions.toArray(), [], [] as Transaction[])

  const [activeType, setActiveType] = useState<CategoryType>('expense')
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [dialog, setDialog] = useState<DialogState>({ mode: 'closed' })

  const parentIds = useMemo(
    () => new Set(allCategories.map(c => c.parentId).filter(Boolean) as string[]),
    [allCategories]
  )

  const txCountByCat = useMemo(() => {
    const map = new Map<string, number>()
    for (const t of allTransactions) {
      if (!t.categoryId) continue
      map.set(t.categoryId, (map.get(t.categoryId) ?? 0) + 1)
    }
    return map
  }, [allTransactions])

  const visibleRows = useMemo(() => {
    const result: Array<{ cat: Category; depth: number }> = []
    const visit = (parentId: string | undefined, depth: number) => {
      const cats = allCategories
        .filter(c => c.type === activeType && c.parentId === parentId)
        .sort((a, b) => a.sortOrder - b.sortOrder)
      for (const cat of cats) {
        result.push({ cat, depth })
        if (expandedIds.has(cat.id)) visit(cat.id, depth + 1)
      }
    }
    visit(undefined, 0)
    return result
  }, [allCategories, activeType, expandedIds])

  const rootCount = useMemo(
    () => allCategories.filter(c => c.type === activeType && !c.parentId).length,
    [allCategories, activeType]
  )

  const handleToggle = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleMove = async (cat: Category, delta: -1 | 1) => {
    const siblings = allCategories
      .filter(c => c.type === cat.type && c.parentId === cat.parentId)
      .sort((a, b) => a.sortOrder - b.sortOrder)
    const idx = siblings.findIndex(c => c.id === cat.id)
    const target = idx + delta
    if (target < 0 || target >= siblings.length) return
    const swap = siblings[target]
    await Promise.all([
      db.categories.update(cat.id, { sortOrder: swap.sortOrder }),
      db.categories.update(swap.id, { sortOrder: cat.sortOrder })
    ])
  }

  const handleDelete = async (cat: Category) => {
    const childCount = allCategories.filter(c => c.parentId === cat.id).length
    const txCount = txCountByCat.get(cat.id) ?? 0
    if (childCount > 0) {
      alert(`此分类下有 ${childCount} 个子分类，请先删除子分类。`)
      return
    }
    if (txCount > 0) {
      if (!confirm(`此分类有 ${txCount} 笔交易关联，删除后交易将变为「未分类」。继续？`)) return
    } else {
      if (!confirm(`删除分类「${cat.name}」？`)) return
    }
    await db.categories.delete(cat.id)
    setDialog({ mode: 'closed' })
  }

  return (
    <div className="page categories-page">
      <header className="form-header">
        <button className="form-header-btn" onClick={() => navigate(-1)}>返回</button>
        <span className="form-title">分类管理</span>
        <button
          className="form-header-btn primary"
          onClick={() => setDialog({ mode: 'new' })}
        >
          + 新建
        </button>
      </header>

      <div className="cat-tabs">
        <button
          className={activeType === 'expense' ? 'active' : ''}
          onClick={() => setActiveType('expense')}
        >
          支出
        </button>
        <button
          className={activeType === 'income' ? 'active' : ''}
          onClick={() => setActiveType('income')}
        >
          收入
        </button>
      </div>

      <div className="cat-summary">
        共 {rootCount} 个一级分类，{visibleRows.length} 个分类
      </div>

      <div className="cat-list">
        {visibleRows.map(({ cat, depth }) => {
          const hasKids = parentIds.has(cat.id)
          const expanded = expandedIds.has(cat.id)
          const txCount = txCountByCat.get(cat.id) ?? 0
          return (
            <div
              key={cat.id}
              className="cat-edit-row"
              style={{ paddingLeft: 12 + depth * 20 }}
            >
              {depth > 0 && <span className="cat-tree-indent">└</span>}
              {hasKids ? (
                <button
                  className="cat-expand-btn"
                  onClick={() => handleToggle(cat.id)}
                  aria-label={expanded ? '收起' : '展开'}
                >
                  <span className={`cat-chevron ${expanded ? 'expanded' : ''}`}>›</span>
                </button>
              ) : (
                <span className="cat-expand-spacer" />
              )}
              <CategoryIcon icon={cat.icon} color={cat.colorHex} size={32} />
              <button
                className="cat-info"
                onClick={() => setDialog({ mode: 'edit', category: cat })}
              >
                <span className="cat-name-text">{cat.name}</span>
                <span className="cat-meta">
                  {cat.isSystem ? '系统' : '自定义'}
                  {txCount > 0 && ` · ${txCount} 笔`}
                </span>
              </button>
              <div className="cat-actions">
                <button
                  className="cat-action-btn"
                  onClick={() => handleMove(cat, -1)}
                  aria-label="上移"
                >
                  ↑
                </button>
                <button
                  className="cat-action-btn"
                  onClick={() => handleMove(cat, 1)}
                  aria-label="下移"
                >
                  ↓
                </button>
                {hasKids && (
                  <button
                    className="cat-action-btn add-child"
                    onClick={() => setDialog({ mode: 'new', parentId: cat.id })}
                    aria-label="新增子分类"
                  >
                    +
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {dialog.mode !== 'closed' && (
        <CategoryDialog
          state={dialog}
          type={activeType}
          onClose={() => setDialog({ mode: 'closed' })}
          onDelete={handleDelete}
        />
      )}
    </div>
  )
}

interface DialogProps {
  state: Exclude<DialogState, { mode: 'closed' }>
  type: CategoryType
  onClose: () => void
  onDelete: (cat: Category) => Promise<void>
}

function CategoryDialog({ state, type, onClose, onDelete }: DialogProps) {
  const isEdit = state.mode === 'edit'
  const existing = isEdit ? state.category : undefined
  const parentId = !isEdit && state.mode === 'new' ? state.parentId : undefined

  const [name, setName] = useState(existing?.name ?? '')
  const [icon, setIcon] = useState(existing?.icon ?? '💸')
  const [colorHex, setColorHex] = useState(existing?.colorHex ?? '#5B8DEF')

  const canSave = name.trim().length > 0

  const handleSave = async () => {
    if (!canSave) return
    if (existing) {
      await db.categories.update(existing.id, {
        name: name.trim(),
        icon,
        colorHex
      })
    } else {
      const all = await db.categories.toArray()
      const siblings = all.filter(c => c.type === type && c.parentId === parentId)
      const maxOrder = siblings.reduce((m, c) => Math.max(m, c.sortOrder), -1)
      await db.categories.add({
        id: uid(),
        name: name.trim(),
        type,
        icon,
        colorHex,
        sortOrder: maxOrder + 1,
        isSystem: false,
        parentId
      })
    }
    onClose()
  }

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog-sheet" onClick={e => e.stopPropagation()}>
        <div className="dialog-header">
          <button className="dialog-btn" onClick={onClose}>取消</button>
          <span className="dialog-title">
            {isEdit ? '编辑分类' : parentId ? '新增子分类' : '新增分类'}
          </span>
          <button
            className="dialog-btn primary"
            onClick={handleSave}
            disabled={!canSave}
          >
            保存
          </button>
        </div>

        <div className="dialog-body">
          <div className="dialog-field">
            <label>名称</label>
            <input
              className="form-input"
              type="text"
              placeholder="例如：咖啡"
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
              maxLength={12}
            />
          </div>

          <div className="dialog-field">
            <label>图标</label>
            <div className="icon-grid">
              {PRESET_ICONS.map(ic => (
                <button
                  key={ic}
                  className={`icon-cell ${icon === ic ? 'active' : ''}`}
                  onClick={() => setIcon(ic)}
                >
                  {ic}
                </button>
              ))}
            </div>
            <input
              className="form-input icon-text"
              type="text"
              value={icon}
              onChange={e => setIcon(e.target.value)}
              maxLength={4}
              placeholder="或直接输入 emoji"
            />
          </div>

          <div className="dialog-field">
            <label>颜色</label>
            <div className="color-row">
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  className={`color-dot ${colorHex === c ? 'active' : ''}`}
                  style={{ background: c }}
                  onClick={() => setColorHex(c)}
                  aria-label={c}
                />
              ))}
            </div>
          </div>

          {isEdit && existing && (
            <button
              className="delete-btn"
              onClick={() => onDelete(existing)}
            >
              删除此分类
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
