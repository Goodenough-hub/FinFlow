import { useState, useEffect } from 'react'
import type { CSSProperties } from 'react'
import type { AccountType } from '../db/models'
import { BANK_PRESETS, ACCOUNT_TYPES } from '../db/models'
import CategoryIcon from './CategoryIcon'

interface Props {
  type: AccountType
  icon: string
  colorHex: string
  size?: number
}

const attempted = new Set<string>()

export default function AccountIcon({ type, icon, colorHex, size = 36 }: Props) {
  const cacheKey = type === 'bank' ? `bank:${icon}` : type
  const [failed, setFailed] = useState(attempted.has(cacheKey))

  useEffect(() => {
    setFailed(attempted.has(cacheKey))
  }, [cacheKey])

  // 空/未知 type（如数据异常导致 type 丢失）没有对应 SVG，直接用文字兜底，
  // 避免请求 /icons/accounts/.svg 拿到 404 再闪一下。
  const knownType = (ACCOUNT_TYPES as string[]).includes(type)

  if (failed || !knownType) {
    let fallbackIcon = icon
    if (type === 'bank') {
      const bank = BANK_PRESETS.find(b => b.code === icon)
      fallbackIcon = bank?.abbr ?? '行'
    }
    return <CategoryIcon icon={fallbackIcon || '卡'} color={colorHex} size={size} />
  }

  const src = type === 'bank' && icon
    ? `/icons/accounts/bank-${icon}.svg`
    : `/icons/accounts/${type}.svg`

  const radius = size * 0.28
  const style: CSSProperties = {
    width: size,
    height: size,
    borderRadius: radius,
    flexShrink: 0,
    display: 'block',
    objectFit: 'cover',
    border: `0.5px solid ${colorHex}44`
  }

  return (
    <img
      src={src}
      alt=""
      style={style}
      onError={() => {
        attempted.add(cacheKey)
        setFailed(true)
      }}
    />
  )
}
