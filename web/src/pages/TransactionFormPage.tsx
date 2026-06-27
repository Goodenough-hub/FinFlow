import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, uid } from '../db/db'
import type { Account, Category, Transaction, TransactionType } from '../db/models'
import { toISODate } from '../utils/date'
import CategoryIcon from '../components/CategoryIcon'
import AccountIcon from '../components/AccountIcon'
import './TransactionFormPage.css'

const VENDORS = ['高德', '滴滴', '美团', 'T3出行', '曹操出行', '其他']

export default function TransactionFormPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)

  const allCategories = useLiveQuery(() => db.categories.toArray(), [], [] as Category[])
  const allAccounts = useLiveQuery(() => db.accounts.toArray(), [], [] as Account[])
  const existing = useLiveQuery(
    async () => (id ? await db.transactions.get(id) : undefined),
    [id]
  )

  const [type, setType] = useState<TransactionType>('expense')
  const [amountText, setAmountText] = useState('')
  const [note, setNote] = useState('')
  const [date, setDate] = useState(toISODate(new Date()))
  const [time, setTime] = useState<string>('12:00')
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>()
  const [selectedAccountId, setSelectedAccountId] = useState<string | undefined>()
  const [toAccountId, setToAccountId] = useState<string | undefined>()
  const [vendor, setVendor] = useState<string>('')
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!existing) return
    setType(existing.type)
    setAmountText(String(existing.amount))
    setNote(existing.note)
    setDate(existing.date)
    setTime(existing.time ?? '12:00')
    setSelectedCategoryId(existing.categoryId)
    setSelectedAccountId(existing.accountId)
    setToAccountId(existing.toAccountId)
    setVendor(existing.vendor ?? '')
  }, [existing])

  useEffect(() => {
    if (!isEdit && !selectedAccountId && allAccounts.length) {
      const first = allAccounts.find(a => a.type !== 'fixed') ?? allAccounts[0]
      setSelectedAccountId(first.id)
    }
  }, [allAccounts, isEdit, selectedAccountId])

  const availableAccounts = useMemo(() => allAccounts.filter(a => a.type !== 'fixed'), [allAccounts])
  const isTransfer = type === 'transfer'

  const parentIds = useMemo(() => new Set(allCategories.map(c => c.parentId).filter(Boolean) as string[]), [allCategories])

  const visibleCategories = useMemo(() => {
    if (isTransfer) return []
    const catType = type === 'income' ? 'income' : 'expense'
    const result: Array<{ cat: Category; depth: number }> = []
    const visit = (parentId: string | undefined, depth: number) => {
      const cats = allCategories
        .filter(c => c.type === catType && c.parentId === parentId)
        .sort((a, b) => a.sortOrder - b.sortOrder)
      for (const cat of cats) {
        result.push({ cat, depth })
        if (expandedIds.has(cat.id)) visit(cat.id, depth + 1)
      }
    }
    visit(undefined, 0)
    return result
  }, [allCategories, type, expandedIds, isTransfer])

  const selectedCategory = useMemo(
    () => allCategories.find(c => c.id === selectedCategoryId),
    [allCategories, selectedCategoryId]
  )
  const showVendorPicker = selectedCategory?.name === '打车'

  const isSavable = useMemo(() => {
    const v = parseFloat(amountText.replace(',', '.'))
    if (!Number.isFinite(v) || v <= 0) return false
    if (isTransfer) {
      return Boolean(selectedAccountId) && Boolean(toAccountId) && selectedAccountId !== toAccountId
    }
    return selectedCategoryId != null
  }, [amountText, selectedCategoryId, isTransfer, selectedAccountId, toAccountId])

  const handleTypeChange = (t: TransactionType) => {
    setType(t)
    setSelectedCategoryId(undefined)
    setExpandedIds(new Set())
    if (t === 'transfer') {
      setVendor('')
      const first = allAccounts.find(a => a.id !== selectedAccountId) ?? allAccounts[0]
      setToAccountId(first?.id)
    } else {
      setToAccountId(undefined)
    }
  }

  const handleCategoryClick = (cat: Category) => {
    if (parentIds.has(cat.id)) {
      setExpandedIds(prev => {
        const next = new Set(prev)
        if (next.has(cat.id)) next.delete(cat.id)
        else next.add(cat.id)
        return next
      })
    } else {
      setSelectedCategoryId(cat.id)
    }
  }

  const handleSave = async () => {
    const value = parseFloat(amountText.replace(',', '.'))
    if (!Number.isFinite(value) || value <= 0) return
    const now = new Date().toISOString()

    if (isTransfer) {
      if (!selectedAccountId || !toAccountId || selectedAccountId === toAccountId) return
      if (existing) {
        await db.transactions.update(existing.id, {
          amount: value,
          type,
          note,
          date,
          time,
          accountId: selectedAccountId,
          toAccountId,
          categoryId: undefined,
          vendor: undefined
        })
      } else {
        const tx: Transaction = {
          id: uid(),
          amount: value,
          type,
          note,
          date,
          time,
          createdAt: now,
          accountId: selectedAccountId,
          toAccountId,
          categoryId: undefined,
          vendor: undefined
        }
        await db.transactions.add(tx)
      }
      navigate(-1)
      return
    }

    if (!selectedCategoryId) return
    const vendorValue = showVendorPicker && vendor ? vendor : undefined

    if (existing) {
      await db.transactions.update(existing.id, {
        amount: value,
        type,
        note,
        date,
        time,
        categoryId: selectedCategoryId,
        accountId: selectedAccountId,
        toAccountId: undefined,
        vendor: vendorValue
      })
    } else {
      const tx: Transaction = {
        id: uid(),
        amount: value,
        type,
        note,
        date,
        time,
        createdAt: now,
        categoryId: selectedCategoryId,
        accountId: selectedAccountId,
        vendor: vendorValue
      }
      await db.transactions.add(tx)
    }
    navigate(-1)
  }

  const handleDelete = async () => {
    if (!existing) return
    if (!confirm('确定删除此交易？')) return
    await db.transactions.delete(existing.id)
    navigate(-1)
  }

  return (
    <div className="form-page">
      <header className="form-header">
        <button className="form-header-btn" onClick={() => navigate(-1)}>取消</button>
        <span className="form-title">{isEdit ? '编辑' : '记一笔'}</span>
        <button
          className="form-header-btn primary"
          onClick={handleSave}
          disabled={!isSavable}
        >
          保存
        </button>
      </header>

      <div className="form-body">
        <section className="form-section">
          <div className="type-segmented">
            <button className={type === 'expense' ? 'active' : ''} onClick={() => handleTypeChange('expense')}>
              支出
            </button>
            <button className={type === 'income' ? 'active' : ''} onClick={() => handleTypeChange('income')}>
              收入
            </button>
            <button className={type === 'transfer' ? 'active' : ''} onClick={() => handleTypeChange('transfer')}>
              转账
            </button>
          </div>
        </section>

        <section className="form-section">
          <div className="section-label">金额</div>
          <div className="amount-input-wrap">
            <span className="amount-currency">¥</span>
            <input
              className="amount-input"
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              value={amountText}
              onChange={e => setAmountText(e.target.value)}
              autoFocus={!isEdit}
            />
          </div>
        </section>

        {!isTransfer && (
          <section className="form-section">
            <div className="section-label">分类</div>
            {visibleCategories.length === 0 ? (
              <div className="form-empty">暂无分类，请先在设置中创建</div>
            ) : (
              <div className="category-tree">
                {visibleCategories.map(({ cat, depth }) => {
                  const hasKids = parentIds.has(cat.id)
                  const selected = selectedCategoryId === cat.id
                  const expanded = expandedIds.has(cat.id)
                  return (
                    <div
                      key={cat.id}
                      className={`cat-row ${selected ? 'selected' : ''}`}
                      style={{ paddingLeft: 10 + depth * 20 }}
                      onClick={() => handleCategoryClick(cat)}
                    >
                      {depth > 0 && <span className="cat-indent">⋯</span>}
                      <CategoryIcon icon={cat.icon} color={cat.colorHex} size={32} />
                      <span className={`cat-name ${selected ? 'selected' : ''}`}>{cat.name}</span>
                      {hasKids && (
                        <span className={`cat-chevron ${expanded ? 'expanded' : ''}`}>›</span>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
            {showVendorPicker && (
              <div className="vendor-picker">
                <div className="section-label" style={{ marginTop: 12 }}>打车 App</div>
                <div className="vendor-grid">
                  {VENDORS.map(v => (
                    <button
                      key={v}
                      className={vendor === v ? 'active' : ''}
                      onClick={() => setVendor(v)}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        <section className="form-section">
          <div className="section-label">日期与时间</div>
          <div className="datetime-row">
            <input
              type="date"
              className="form-input"
              value={date}
              onChange={e => setDate(e.target.value || toISODate(new Date()))}
            />
            <input
              type="time"
              className="form-input"
              value={time}
              onChange={e => setTime(e.target.value || '12:00')}
            />
          </div>
        </section>

        {isTransfer ? (
          <>
            <section className="form-section">
              <div className="section-label">转出账户</div>
              {allAccounts.length === 0 ? (
                <div className="form-empty">暂无账户，请先在资产页创建</div>
              ) : (
                <div className="account-grid">
                  {allAccounts.map(acc => {
                    const selected = selectedAccountId === acc.id
                    const disabled = acc.id === toAccountId
                    return (
                      <button
                        key={acc.id}
                        className={`account-cell ${selected ? 'selected' : ''} ${disabled ? 'dim' : ''}`}
                        onClick={() => setSelectedAccountId(acc.id)}
                        disabled={disabled}
                      >
                        <AccountIcon type={acc.type} icon={acc.icon} colorHex={acc.colorHex} size={36} />
                        <span className="account-name">{acc.name}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </section>

            <section className="form-section">
              <div className="section-label">转入账户</div>
              {allAccounts.length === 0 ? (
                <div className="form-empty">暂无账户</div>
              ) : (
                <div className="account-grid">
                  {allAccounts.map(acc => {
                    const selected = toAccountId === acc.id
                    const disabled = acc.id === selectedAccountId
                    return (
                      <button
                        key={acc.id}
                        className={`account-cell ${selected ? 'selected' : ''} ${disabled ? 'dim' : ''}`}
                        onClick={() => setToAccountId(acc.id)}
                        disabled={disabled}
                      >
                        <AccountIcon type={acc.type} icon={acc.icon} colorHex={acc.colorHex} size={36} />
                        <span className="account-name">{acc.name}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </section>
          </>
        ) : (
          <section className="form-section">
            <div className="section-label">账户</div>
            {availableAccounts.length === 0 ? (
              <div className="form-empty">暂无账户，请先在资产页创建</div>
            ) : (
              <div className="account-grid">
                {availableAccounts.map(acc => {
                  const selected = selectedAccountId === acc.id
                  return (
                    <button
                      key={acc.id}
                      className={`account-cell ${selected ? 'selected' : ''}`}
                      onClick={() => setSelectedAccountId(acc.id)}
                    >
                      <AccountIcon type={acc.type} icon={acc.icon} colorHex={acc.colorHex} size={36} />
                      <span className="account-name">{acc.name}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </section>
        )}

        <section className="form-section">
          <div className="section-label">备注</div>
          <textarea
            className="form-textarea"
            placeholder="可选"
            rows={3}
            value={note}
            onChange={e => setNote(e.target.value)}
          />
        </section>

        {isEdit && (
          <section className="form-section">
            <button className="delete-btn" onClick={handleDelete}>删除此交易</button>
          </section>
        )}
      </div>
    </div>
  )
}
