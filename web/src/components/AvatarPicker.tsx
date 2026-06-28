import { useRef, useState } from 'react'
import { updateAvatar } from '../api/auth'
import './AvatarPicker.css'

interface AvatarPickerProps {
  username: string
  currentAvatar: string
  onClose: () => void
  onSaved: (avatar: string) => void
}

const PRESETS: Array<{ id: string; from: string; to: string }> = [
  { id: 'preset:0', from: '#007AFF', to: '#00C6FF' },
  { id: 'preset:1', from: '#5856D6', to: '#AF52DE' },
  { id: 'preset:2', from: '#34C759', to: '#30D158' },
  { id: 'preset:3', from: '#FF9500', to: '#FF6B00' },
  { id: 'preset:4', from: '#FF3B30', to: '#FF2D55' },
  { id: 'preset:5', from: '#AF52DE', to: '#FF375F' },
  { id: 'preset:6', from: '#5AC8FA', to: '#007AFF' },
  { id: 'preset:7', from: '#FFD60A', to: '#FF9500' },
  { id: 'preset:8', from: '#64D2FF', to: '#5E5CE6' },
  { id: 'preset:9', from: '#FF6482', to: '#FF3B30' },
  { id: 'preset:10', from: '#30D158', to: '#28CD41' },
  { id: 'preset:11', from: '#BF5AF2', to: '#7C4DFF' }
]

export default function AvatarPicker({ username, currentAvatar, onClose, onSaved }: AvatarPickerProps) {
  const [tab, setTab] = useState<'preset' | 'upload'>('preset')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const letter = username.charAt(0).toUpperCase()

  const save = async (avatar: string) => {
    setBusy(true)
    setError('')
    try {
      await updateAvatar(avatar)
      onSaved(avatar)
      onClose()
    } catch (e: any) {
      setError(e.response?.data?.error || '保存失败')
    } finally {
      setBusy(false)
    }
  }

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('请选择图片文件')
      return
    }
    if (file.size > 8 * 1024 * 1024) {
      setError('图片不能超过 8MB')
      return
    }
    setBusy(true)
    setError('')
    try {
      const dataUrl = await fileToSquareDataUrl(file, 256)
      await save(dataUrl)
    } catch (e: any) {
      setError(e.message || '处理失败')
      setBusy(false)
    }
  }

  const previewStyle = (avatar: string): React.CSSProperties => {
    if (avatar.startsWith('data:')) {
      return { backgroundImage: `url(${avatar})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    }
    if (avatar.startsWith('preset:')) {
      const idx = parseInt(avatar.slice(7), 10)
      const p = PRESETS[idx]
      if (p) return { background: `linear-gradient(135deg, ${p.from}, ${p.to})` }
    }
    return { background: 'linear-gradient(135deg, #007AFF, #00C6FF)' }
  }

  return (
    <div className="avatar-picker-mask" onClick={onClose}>
      <div className="avatar-picker" onClick={e => e.stopPropagation()}>
        <div className="avatar-picker-header">
          <h2>更换头像</h2>
          <button className="avatar-picker-close" onClick={onClose} aria-label="关闭">×</button>
        </div>

        <div className="avatar-picker-preview">
          <div
            className="avatar-picker-preview-circle"
            style={previewStyle(currentAvatar || 'preset:0')}
          >
            {(currentAvatar.startsWith('preset:') || !currentAvatar) && letter}
          </div>
        </div>

        <div className="avatar-picker-tabs">
          <button
            className={tab === 'preset' ? 'active' : ''}
            onClick={() => setTab('preset')}
          >预设</button>
          <button
            className={tab === 'upload' ? 'active' : ''}
            onClick={() => setTab('upload')}
          >上传</button>
        </div>

        {tab === 'preset' && (
          <div className="avatar-picker-presets">
            {PRESETS.map(p => (
              <button
                key={p.id}
                className="avatar-preset-item"
                style={{ background: `linear-gradient(135deg, ${p.from}, ${p.to})` }}
                onClick={() => !busy && save(p.id)}
                disabled={busy}
              >
                {letter}
              </button>
            ))}
          </div>
        )}

        {tab === 'upload' && (
          <div className="avatar-picker-upload">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={e => {
                const f = e.target.files?.[0]
                if (f) handleFile(f)
                e.target.value = ''
              }}
            />
            <button
              className="avatar-upload-btn"
              onClick={() => fileRef.current?.click()}
              disabled={busy}
            >
              {busy ? '处理中…' : '选择图片'}
            </button>
            <p className="avatar-upload-hint">支持 JPG / PNG，会自动裁剪为正方形</p>
          </div>
        )}

        {error && <div className="avatar-picker-error">{error}</div>}
      </div>
    </div>
  )
}

function fileToSquareDataUrl(file: File, size: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')!
        const min = Math.min(img.width, img.height)
        const sx = (img.width - min) / 2
        const sy = (img.height - min) / 2
        ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size)
        resolve(canvas.toDataURL('image/jpeg', 0.85))
      }
      img.onerror = () => reject(new Error('图片加载失败'))
      img.src = reader.result as string
    }
    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsDataURL(file)
  })
}
