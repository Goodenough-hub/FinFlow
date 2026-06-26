import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import type { Account, Category, TransactionType } from '../db/models'
import CategoryIcon from './CategoryIcon'
import './TransactionFilterSheet.css'

export interface FilterCriteria {
  categoryIds: string[]
  accountIds: string[]
  useDateRange: boolean
  startDate: string
  endDate: string
  useAmountRange: boolean
  minAmount: string
  maxAmount: string
  useType: boolean
  type: TransactionType
  noteContains: string
}

export function emptyCriteria(): FilterCriteria {
  return {
    categoryIds: [],
    accountIds: [],
    useDateRange: false,
    startDate: '',
    endDate: '',
    useAmountRange: false,
    minAmount: '',
    maxAmount: '',
    useType: false,
    type: 'expense',
    noteContains: ''
  }
}

export function activeCount(c: FilterCriteria): number {
  let n = 0
  if (c.categoryIds.length > 0) n++
  if (c.accountIds.length > 0) n++
  if (c.useDateRange) n++
  if (c.useAmountRange) n++
  if (c.useType) n++
  if (c.noteContains.trim()) n++
  return n
}

export function isCriteriaEmpty(c: FilterCriteria): boolean {
  return activeCount(c) === 0
}

interface Props {
  criteria: FilterCriteria
  onApply: (c: FilterCriteria) => void
  onClose: () => void
}

export default function TransactionFilterSheet({ criteria, onApply, onClose }: Props) {
  const allCategories = useLiveQuery(() => db.categories.toArray(), [], [] as Category[])
  const allAccounts = useLiveQuery(() => db.accounts.toArray(), [], [] as Account[])

  const [draft, setDraft] = useState<FilterCriteria>(criteria)

  useEffect(() => {
    setDraft(criteria)
  }, [criteria])

  const sortedCategories = allCategories.slice().sort((a, b) => a.sortOrder - b.sortOrder)
  const sortedAccounts = allAccounts.slice().sort((a, b) => a.sortOrder - b.sortOrder)

  const toggleId = (id: string, list: string[]): string[] =>
    list.includes(id) ? list.filter(x => x !== id) : [...list, id]

  const reset = () => setDraft(emptyCriteria())

  const apply = () => {
    onApply(draft)
    onClose()
  }

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog-sheet" onClick={e => e.stopPropagation()}>
        <div className="dialog-header">
          <button className="dialog-btn" onClick={reset}>重置</button>
          <span className="dialog-title">筛选</span>
          <button className="dialog-btn primary" onClick={apply}>完成</button>
        </div>

        <div className="dialog-body">
          <section className="filter-section">
            <div className="filter-section-head">
              <label className="filter-toggle">
                <input
                  type="checkbox"
                  checked={draft.useType}
                  onChange={e => setDraft({ ...draft, useType: e.target.checked })}
                />
                <span>按类型</span>
              </label>
            </div>
            {draft.useType && (
              <div className="type-segmented">
                {(['expense', 'income', 'transfer'] as TransactionType[]).map(t => (
                  <button
                    key={t}
                    className={draft.type === t ? 'active' : ''}
                    onClick={() => setDraft({ ...draft, type: t })}
                  >
                    {t === 'expense' ? '支出' : t === 'income' ? '收入' : '转账'}
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="filter-section">
            <div className="filter-section-head">
              <label className="filter-section-title">分类 ({draft.categoryIds.length})</label>
              {draft.categoryIds.length > 0 && (
                <button
                  className="filter-clear-mini"
                  onClick={() => setDraft({ ...draft, categoryIds: [] })}
                >清除</button>
              )}
            </div>
            <div className="multi-grid">
              {sortedCategories.map(c => (
                <button
                  key={c.id}
                  className={`multi-cell ${draft.categoryIds.includes(c.id) ? 'active' : ''}`}
                  onClick={() => setDraft({ ...draft, categoryIds: toggleId(c.id, draft.categoryIds) })}
                >
                  <CategoryIcon icon={c.icon} color={c.colorHex} size={28} />
                  <span className="multi-name">{c.name}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="filter-section">
            <div className="filter-section-head">
              <label className="filter-section-title">账户 ({draft.accountIds.length})</label>
              {draft.accountIds.length > 0 && (
                <button
                  className="filter-clear-mini"
                  onClick={() => setDraft({ ...draft, accountIds: [] })}
                >清除</button>
              )}
            </div>
            <div className="multi-grid">
              {sortedAccounts.map(a => (
                <button
                  key={a.id}
                  className={`multi-cell ${draft.accountIds.includes(a.id) ? 'active' : ''}`}
                  onClick={() => setDraft({ ...draft, accountIds: toggleId(a.id, draft.accountIds) })}
                >
                  <CategoryIcon icon={a.icon} color={a.colorHex} size={28} />
                  <span className="multi-name">{a.name}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="filter-section">
            <div className="filter-section-head">
              <label className="filter-toggle">
                <input
                  type="checkbox"
                  checked={draft.useDateRange}
                  onChange={e => setDraft({ ...draft, useDateRange: e.target.checked })}
                />
                <span>按日期范围</span>
              </label>
            </div>
            {draft.useDateRange && (
              <div className="range-row">
                <input
                  className="form-input"
                  type="date"
                  value={draft.startDate}
                  onChange={e => setDraft({ ...draft, startDate: e.target.value })}
                />
                <span className="range-sep">至</span>
                <input
                  className="form-input"
                  type="date"
                  value={draft.endDate}
                  onChange={e => setDraft({ ...draft, endDate: e.target.value })}
                />
              </div>
            )}
          </section>

          <section className="filter-section">
            <div className="filter-section-head">
              <label className="filter-toggle">
                <input
                  type="checkbox"
                  checked={draft.useAmountRange}
                  onChange={e => setDraft({ ...draft, useAmountRange: e.target.checked })}
                />
                <span>按金额范围</span>
              </label>
            </div>
            {draft.useAmountRange && (
              <div className="range-row">
                <input
                  className="form-input"
                  type="text"
                  inputMode="decimal"
                  placeholder="最小"
                  value={draft.minAmount}
                  onChange={e => setDraft({ ...draft, minAmount: e.target.value })}
                />
                <span className="range-sep">~</span>
                <input
                  className="form-input"
                  type="text"
                  inputMode="decimal"
                  placeholder="最大"
                  value={draft.maxAmount}
                  onChange={e => setDraft({ ...draft, maxAmount: e.target.value })}
                />
              </div>
            )}
          </section>

          <section className="filter-section">
            <div className="filter-section-head">
              <label className="filter-toggle">
                <input
                  type="checkbox"
                  checked={draft.noteContains.trim().length > 0}
                  onChange={e => setDraft({ ...draft, noteContains: e.target.checked ? draft.noteContains : '' })}
                />
                <span>按备注</span>
              </label>
            </div>
            {draft.noteContains.trim().length > 0 && (
              <input
                className="form-input"
                type="text"
                placeholder="包含文字"
                value={draft.noteContains}
                onChange={e => setDraft({ ...draft, noteContains: e.target.value })}
              />
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
