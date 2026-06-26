import './EmptyState.css'

interface Props {
  icon: string
  title: string
  subtitle?: string
  height?: number
}

export default function EmptyState({ icon, title, subtitle, height = 200 }: Props) {
  return (
    <div className="empty-state" style={{ minHeight: height }}>
      <div className="empty-icon">{icon}</div>
      <div className="empty-title">{title}</div>
      {subtitle && <div className="empty-subtitle">{subtitle}</div>}
    </div>
  )
}
