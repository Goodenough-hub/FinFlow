import type { CSSProperties } from 'react'

interface Props {
  icon: string
  color: string
  size?: number
}

export default function CategoryIcon({ icon, color, size = 36 }: Props) {
  const style: CSSProperties = {
    width: size,
    height: size,
    background: `${color}22`,
    borderRadius: size * 0.28,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: size * 0.55,
    lineHeight: 1,
    flexShrink: 0,
    border: `0.5px solid ${color}44`
  }
  return <span style={style}>{icon}</span>
}
