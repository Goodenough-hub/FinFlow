import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { TransactionType } from '../db/models'
import { useTrips, refreshTrips, useCategories, useAccounts } from '../hooks/useLookup'
import { transactionsApi } from '../api/finflow'
import { getTripCategoryGroups, tripDateRangeText } from '../utils/trip'
import CategoryIcon from '../components/CategoryIcon'
import './Trips.css'

function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function nowHHMM(): string {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default function TripSpendPage() {
  const navigate = useNavigate()
  const { id: tripId = '' } = useParams()
  const { byId: tripById } = useTrips()
  const { list: allCats = [] } = useCategories()
  const { list: allAccounts = [] } = useAccounts()

  const [type, setType] = useState<TransactionType>('expense')
  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState<string | undefined>()
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  const trip = tripById.get(tripId)

  // 分组分类：交通/餐饮/住宿/游玩/购物/杂项（scope='trip'）
  const groups = useMemo(
    () => getTripCategoryGroups(allCats, type === 'income' ? 'income' : 'expense'),
    [allCats, type]
  )

  const defaultAccountId = useMemo(() => {
    const leaf = allAccounts.find(a => a.type !== 'fixed' && !a.parentId) ?? allAccounts[0]
    return leaf?.id
  }, [allAccounts])

  const handleTypeChange = (t: TransactionType) => {
    setType(t)
    setCategoryId(undefined)
  }

  const amountNum = parseFloat(amount || '0')
  const savable = !busy && amountNum > 0 && Boolean(categoryId)

  const handleSave = async () => {
    if (!savable) return
    setBusy(true)
    try {
      await transactionsApi.create({
        amount: amountNum,
        type,
        note,
        date: todayISO(),
        time: nowHHMM(),
        categoryId,
        accountId: defaultAccountId,
        toAccountId: undefined,
        vendor: undefined,
        sourceId: undefined,
        sourceType: undefined,
        tripId,
      })
      await refreshTrips()
      navigate(`/trips/${tripId}`, { replace: true })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="trip-spend">
      <header className="trip-spend-head">
        <button className="header-icon" onClick={() => navigate(-1)} aria-label="返回">‹</button>
        <div className="trip-spend-title">
          <span className="tst-name">✈️ {trip?.name ?? '旅游'}</span>
          <span className="tst-meta">{tripDateRangeText(trip ?? {})}</span>
        </div>
      </header>

      <div className="trip-spend-scroll">
        <div className="type-segmented">
          <button
            className={`seg-btn expense ${type === 'expense' ? 'active' : ''}`}
            onClick={() => handleTypeChange('expense')}
          >支出</button>
          <button
            className={`seg-btn income ${type === 'income' ? 'active' : ''}`}
            onClick={() => handleTypeChange('income')}
          >收入</button>
        </div>

        {groups.map(({ group, children }) => (
          <div key={group.id} className="trip-cat-group">
            <div className="trip-cat-group-title">
              <CategoryIcon icon={group.icon} color={group.colorHex} size={20} />
              <span>{group.name}</span>
            </div>
            <div className="trip-cat-chips">
              {children.map(c => (
                <button
                  key={c.id}
                  className={`trip-cat-chip ${categoryId === c.id ? 'active' : ''}`}
                  style={categoryId === c.id ? { borderColor: c.colorHex } : undefined}
                  onClick={() => setCategoryId(c.id)}
                >
                  <CategoryIcon icon={c.icon} color={c.colorHex} size={26} />
                  <span>{c.name}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="trip-spend-dock">
        <div className="trip-amount-row">
          <span className="tar-cur">¥</span>
          <input
            className="tar-input"
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            autoFocus
          />
        </div>
        <input
          className="trip-note-input"
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="备注（可选）"
        />
        <button className="trip-btn" disabled={!savable} onClick={handleSave}>
          {busy ? '保存中…' : '保存'}
        </button>
      </div>
    </div>
  )
}
