import { useEffect, useState } from 'react'
import { useTrips, refreshTrips } from '../hooks/useLookup'
import { tripsApi } from '../api/finflow'
import type { Trip } from '../db/models'
import { tripDeleteConfirmText, tripDateRangeText } from '../utils/trip'
import '../pages/Trips.css'

interface Props {
  onClose: () => void
  onPick: (tripId: string) => void
}

// 选已有旅游 / 快建新旅游。用于账单页「旅游记账」按钮入口。
export default function TripPickerDialog({ onClose, onPick }: Props) {
  const { list: trips = [] } = useTrips()
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [busy, setBusy] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const handleCreate = async () => {
    if (!name.trim()) return
    setBusy(true)
    try {
      const t = await tripsApi.create({
        name: name.trim(),
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        budget: 0,
        note: '',
      })
      await refreshTrips()
      onPick(t.id)
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async (t: Trip) => {
    if (!confirm(tripDeleteConfirmText(t.name))) return
    setDeletingId(t.id)
    try {
      await tripsApi.remove(t.id)
      await refreshTrips()
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="trip-overlay" onClick={onClose}>
      <div className="trip-sheet" onClick={e => e.stopPropagation()}>
        <div className="trip-sheet-head">
          <span className="title">{creating ? '新建旅游' : '选择旅游'}</span>
          <button className="close" onClick={onClose}>✕</button>
        </div>

        {!creating && (
          <>
            {trips.length === 0 ? (
              <div className="trip-empty-hint">还没有旅游，先新建一个吧</div>
            ) : (
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {trips.map((t: Trip) => (
                  <div key={t.id} className="trip-item-row">
                    <button className="trip-item" onClick={() => onPick(t.id)}>
                      <span className="trip-icon">✈️</span>
                      <span className="trip-info">
                        <span className="name">{t.name}</span>
                        <span className="sub">{tripDateRangeText(t)}</span>
                      </span>
                      <span className="trip-chevron">›</span>
                    </button>
                    <button
                      className="trip-item-del"
                      aria-label={`删除 ${t.name}`}
                      disabled={deletingId === t.id}
                      onClick={() => handleDelete(t)}
                    >🗑</button>
                  </div>
                ))}
              </div>
            )}
            <button className="trip-btn secondary" style={{ marginTop: 12 }} onClick={() => setCreating(true)}>
              + 新建旅游
            </button>
          </>
        )}

        {creating && (
          <>
            <div className="trip-field">
              <label>旅游名称</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="例如：三亚5日游" autoFocus />
            </div>
            <div className="trip-journey">
              <label className="trip-journey-field">
                <span className="cap">出发</span>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
              </label>
              <div className="trip-journey-sep" aria-hidden="true">
                <span className="cap"></span>
                <span className="plane">✈</span>
              </div>
              <label className="trip-journey-field">
                <span className="cap">返程</span>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
              </label>
            </div>
            <button className="trip-btn" disabled={busy || !name.trim()} onClick={handleCreate}>
              {busy ? '创建中…' : '创建并记账'}
            </button>
            <button className="trip-btn secondary" style={{ marginTop: 8 }} onClick={() => setCreating(false)}>
              返回
            </button>
          </>
        )}
      </div>
    </div>
  )
}
