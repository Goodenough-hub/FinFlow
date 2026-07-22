import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Trip } from '../db/models'
import { useQuery } from '../hooks/useQuery'
import { useTrips, refreshTrips } from '../hooks/useLookup'
import { transactionsApi, tripsApi } from '../api/finflow'
import { asCurrency } from '../utils/format'
import { tripDeleteConfirmText, tripDateRangeText } from '../utils/trip'
import './Trips.css'

export default function TripListPage() {
  const navigate = useNavigate()
  const { list: trips = [], loading } = useTrips()
  const { data: txs = [] } = useQuery(() => transactionsApi.list(), [])

  const [editing, setEditing] = useState<Trip | null>(null)
  const [creating, setCreating] = useState(false)

  // 每个旅游的净支出（expense - income，排除 transfer）
  const spendByTrip = useMemo(() => {
    const map = new Map<string, number>()
    for (const t of txs) {
      if (!t.tripId) continue
      if (t.type === 'expense') map.set(t.tripId, (map.get(t.tripId) ?? 0) + t.amount)
      else if (t.type === 'income') map.set(t.tripId, (map.get(t.tripId) ?? 0) - t.amount)
    }
    return map
  }, [txs])

  return (
    <div className="page">
      <header className="page-header">
        <button className="header-icon" onClick={() => navigate('/settings')} aria-label="返回">‹</button>
        <h1>旅游账单</h1>
        <button className="header-icon" onClick={() => setCreating(true)} aria-label="新建">+</button>
      </header>

      {loading && <div className="trip-empty-hint">加载中…</div>}
      {!loading && trips.length === 0 && (
        <div className="card" style={{ margin: 16 }}>
          <div className="trip-empty-hint">
            还没有旅游记录。<br />点右上角 + 新建一次旅游。
          </div>
        </div>
      )}

      {trips.length > 0 && (
        <div className="trip-card-list">
          {trips.map(t => {
            const spend = spendByTrip.get(t.id) ?? 0
            const pct = t.budget > 0 ? Math.min(100, (spend / t.budget) * 100) : 0
            const over = t.budget > 0 && spend > t.budget
            return (
              <div
                key={t.id}
                className="trip-card"
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/trips/${t.id}`)}
                onKeyDown={e => { if (e.key === 'Enter') navigate(`/trips/${t.id}`) }}
              >
                <div className="trip-card-top">
                  <span className="trip-card-plane">✈️</span>
                  <div className="trip-card-info">
                    <span className="trip-card-name">{t.name}</span>
                    <span className="trip-card-dates">{tripDateRangeText(t)}</span>
                  </div>
                  <button
                    className="trip-card-edit"
                    aria-label="编辑"
                    onClick={e => { e.stopPropagation(); setEditing(t) }}
                  >⋯</button>
                </div>
                <div className="trip-card-spend">
                  <span className="tcs-value">{asCurrency(spend)}</span>
                  {t.budget > 0 && <span className="tcs-budget">/ 预算 {asCurrency(t.budget)}</span>}
                </div>
                {t.budget > 0 && (
                  <div className="trip-bar-track">
                    <div
                      className="trip-bar-fill"
                      style={{ width: `${pct}%`, background: over ? 'var(--overspend-red)' : 'var(--accent-blue)' }}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {(creating || editing) && (
        <TripEditDialog
          trip={editing}
          onClose={() => { setCreating(false); setEditing(null) }}
          onSaved={async () => { await refreshTrips(); setCreating(false); setEditing(null) }}
        />
      )}
    </div>
  )
}

function TripEditDialog({
  trip, onClose, onSaved,
}: {
  trip: Trip | null
  onClose: () => void
  onSaved: () => void
}) {
  const isEdit = Boolean(trip)
  const [name, setName] = useState(trip?.name ?? '')
  const [startDate, setStartDate] = useState(trip?.startDate ?? '')
  const [endDate, setEndDate] = useState(trip?.endDate ?? '')
  const [budget, setBudget] = useState(trip ? String(trip.budget) : '0')
  const [note, setNote] = useState(trip?.note ?? '')
  const [busy, setBusy] = useState(false)

  const handleSave = async () => {
    if (!name.trim()) return
    setBusy(true)
    try {
      const payload = {
        name: name.trim(),
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        budget: parseFloat(budget) || 0,
        note,
      }
      if (isEdit && trip) {
        await tripsApi.update(trip.id, payload)
      } else {
        await tripsApi.create(payload)
      }
      await onSaved()
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async () => {
    if (!trip) return
    if (!confirm(tripDeleteConfirmText(trip.name))) return
    setBusy(true)
    try {
      await tripsApi.remove(trip.id)
      await onSaved()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="trip-overlay" onClick={onClose}>
      <div className="trip-sheet" onClick={e => e.stopPropagation()}>
        <div className="trip-sheet-head">
          <span className="title">{isEdit ? '编辑旅游' : '新建旅游'}</span>
          <button className="close" onClick={onClose}>✕</button>
        </div>
        <div className="trip-field">
          <label>名称</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="如：三亚5日游" autoFocus />
        </div>
        <div className="trip-field-row">
          <div className="trip-field">
            <label>开始</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div className="trip-field">
            <label>结束</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
        </div>
        <div className="trip-field">
          <label>预算</label>
          <input inputMode="decimal" value={budget} onChange={e => setBudget(e.target.value)} placeholder="0" />
        </div>
        <div className="trip-field">
          <label>备注</label>
          <textarea rows={2} value={note} onChange={e => setNote(e.target.value)} />
        </div>
        <button className="trip-btn" disabled={busy || !name.trim()} onClick={handleSave}>
          {busy ? '保存中…' : '保存'}
        </button>
        {isEdit && (
          <button className="trip-btn secondary" style={{ marginTop: 8, color: 'var(--overspend-red)' }} onClick={handleDelete} disabled={busy}>
            删除旅游
          </button>
        )}
      </div>
    </div>
  )
}
