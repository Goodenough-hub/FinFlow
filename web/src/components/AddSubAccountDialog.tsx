import { useState } from 'react'
import type { Account, AccountType, BankPreset } from '../db/models'
import {
  accountTypeLabel,
  accountTypeIcon,
  BANK_PRESETS,
  ACCOUNT_SUBTYPE_PRESETS
} from '../db/models'
import { accountsApi } from '../api/finflow'
import { refreshAccounts } from '../hooks/useLookup'

interface Preset {
  name: string
  icon: string
  colorHex: string
  type?: AccountType
}

function getPresets(parentType: AccountType): Preset[] {
  if (parentType === 'alipay' || parentType === 'wechat') {
    const base = accountTypeLabel[parentType]
    return ACCOUNT_SUBTYPE_PRESETS[parentType].map(sub => ({
      name: `${base}·${sub}`,
      icon: accountTypeIcon[parentType],
      colorHex: parentType === 'alipay' ? '#1677FF' : '#07C160',
    }))
  }
  if (parentType === 'unionpay' || parentType === 'bank' || parentType === 'fixed') {
    return BANK_PRESETS.map((b: BankPreset) => ({
      name: b.name,
      icon: b.abbr,
      colorHex: b.colorHex,
      type: 'bank' as AccountType,
    }))
  }
  return []
}

interface AddSubAccountDialogProps {
  parentId: string
  parentType: AccountType
  parentColor: string
  nextOrder: number
  onClose: () => void
}

export default function AddSubAccountDialog({
  parentId, parentType, parentColor, nextOrder, onClose
}: AddSubAccountDialogProps) {
  const [name, setName] = useState('')
  const [initialBalance, setInitialBalance] = useState('0')
  const [icon, setIcon] = useState(accountTypeIcon[parentType])
  const [colorHex, setColorHex] = useState(parentColor)
  const [childType, setChildType] = useState<AccountType>(parentType)

  const presets = getPresets(parentType)
  const canSave = name.trim().length > 0

  const applyPreset = (p: Preset) => {
    setName(p.name)
    setIcon(p.icon)
    setColorHex(p.colorHex)
    if (p.type) setChildType(p.type)
  }

  const handleSave = async () => {
    if (!canSave) return
    const newAccount: Omit<Account, 'id' | 'createdAt'> = {
      name: name.trim(),
      type: childType,
      icon,
      colorHex,
      initialBalance: parseFloat(initialBalance) || 0,
      sortOrder: nextOrder,
      isSystem: false,
      parentId
    }
    await accountsApi.create(newAccount)
    await refreshAccounts()
    onClose()
  }

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog-sheet" onClick={e => e.stopPropagation()}>
        <div className="dialog-header">
          <button className="dialog-btn" onClick={onClose}>取消</button>
          <span className="dialog-title">添加子账户</span>
          <button className="dialog-btn primary" onClick={handleSave} disabled={!canSave}>
            保存
          </button>
        </div>
        <div className="dialog-body">
          {presets.length > 0 && (
            <div className="dialog-field">
              <label>快速选择</label>
              <div className="subtype-row">
                {presets.map(p => (
                  <button
                    key={p.name}
                    className={`subtype-chip ${name === p.name ? 'active' : ''}`}
                    onClick={() => applyPreset(p)}
                  >
                    {p.name.replace(/^(支付宝·|微信·|定期·)/, '')}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="dialog-field">
            <label>名称</label>
            <input
              className="form-input"
              type="text"
              placeholder={`例如：${accountTypeLabel[parentType]}·零钱`}
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
            />
          </div>
          <div className="dialog-field">
            <label>初始余额</label>
            <div className="amount-input-wrap">
              <span className="amount-currency">¥</span>
              <input
                className="amount-input"
                type="text"
                inputMode="decimal"
                value={initialBalance}
                onChange={e => setInitialBalance(e.target.value)}
              />
            </div>
          </div>
          <div className="dialog-field">
            <label>图标</label>
            <input
              className="form-input"
              type="text"
              value={icon}
              onChange={e => setIcon(e.target.value)}
              maxLength={4}
            />
          </div>
          <div className="dialog-field">
            <label>颜色</label>
            <div className="color-row">
              {['#5B8DEF', '#34D399', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#6B7280'].map(c => (
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
        </div>
      </div>
    </div>
  )
}
