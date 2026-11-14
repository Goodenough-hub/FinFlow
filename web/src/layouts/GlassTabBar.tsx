import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent
} from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import {
  LENS_WIDTH_RATIO,
  LENS_ZOOM,
  clampLensCenter,
  stretchFromVelocity,
  tabCenter,
  tabIndexAt
} from '../utils/tabLens'

export interface TabDef {
  to: string
  label: string
  icon: LucideIcon
}

// 按住多久出透镜；按住期间横向滑过 DRAG_SLOP 也立即出（和 iOS 一样拖就有反馈）
export const HOLD_MS = 200
const DRAG_SLOP = 8
// 松手后透镜吸附 + 淡出的总时长，与 MainLayout.css 里 settling 动画对齐
const SETTLE_MS = 400
// 手指停住多久后拉伸回弹到圆形
const STRETCH_IDLE_MS = 80

interface Press {
  id: number
  startX: number
  lastX: number
  lastT: number
  velocity: number // px/ms，指数平滑
  active: boolean
  barLeft: number
  barWidth: number
}

interface Lens {
  settling: boolean
  cx: number
  barWidth: number
  sx: number
  sy: number
}

function TabContent({ tab }: { tab: TabDef }) {
  const Icon = tab.icon
  return (
    <>
      <span className="tab-icon"><Icon size={23} strokeWidth={2} /></span>
      <span className="tab-label">{tab.label}</span>
    </>
  )
}

// 仿支付宝 / iOS 液态玻璃底栏：轻点照常切换；按住或横向拖动出现玻璃透镜，
// 透镜内是同一排 Tab 的放大副本（WebKit 不支持 SVG 背景折射，用克隆放大模拟），
// 跟手移动，松手吸附到最近的 Tab 并切换。
export default function GlassTabBar({ tabs }: { tabs: TabDef[] }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const press = useRef<Press | null>(null)
  const suppressClick = useRef(false)
  const holdTimer = useRef<number>()
  const idleTimer = useRef<number>()
  const settleTimer = useRef<number>()
  const [lens, setLens] = useState<Lens | null>(null)

  const clearTimers = () => {
    window.clearTimeout(holdTimer.current)
    window.clearTimeout(idleTimer.current)
  }
  useEffect(() => () => {
    clearTimers()
    window.clearTimeout(settleTimer.current)
  }, [])

  const activate = (p: Press, target: Element) => {
    p.active = true
    window.clearTimeout(holdTimer.current)
    window.clearTimeout(settleTimer.current)
    // 激活后才捕获指针：轻点时若已捕获，click 会落到 nav 而不是 NavLink 上
    target.setPointerCapture?.(p.id)
    setLens({
      settling: false,
      cx: clampLensCenter(p.lastX - p.barLeft, p.barWidth, tabs.length),
      barWidth: p.barWidth,
      sx: 1,
      sy: 1
    })
  }

  const onPointerDown = (e: ReactPointerEvent<HTMLElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    clearTimers()
    suppressClick.current = false
    const rect = e.currentTarget.getBoundingClientRect()
    const bar = e.currentTarget
    const p: Press = {
      id: e.pointerId,
      startX: e.clientX,
      lastX: e.clientX,
      lastT: e.timeStamp,
      velocity: 0,
      active: false,
      barLeft: rect.left,
      barWidth: rect.width
    }
    press.current = p
    holdTimer.current = window.setTimeout(() => activate(p, bar), HOLD_MS)
  }

  const onPointerMove = (e: ReactPointerEvent<HTMLElement>) => {
    const p = press.current
    if (!p || e.pointerId !== p.id) return
    const dt = e.timeStamp - p.lastT
    if (dt > 0) p.velocity = p.velocity * 0.6 + ((e.clientX - p.lastX) / dt) * 0.4
    p.lastX = e.clientX
    p.lastT = e.timeStamp
    if (!p.active) {
      if (Math.abs(e.clientX - p.startX) <= DRAG_SLOP) return
      activate(p, e.currentTarget)
    }
    const { x: sx, y: sy } = stretchFromVelocity(p.velocity)
    setLens({
      settling: false,
      cx: clampLensCenter(e.clientX - p.barLeft, p.barWidth, tabs.length),
      barWidth: p.barWidth,
      sx,
      sy
    })
    window.clearTimeout(idleTimer.current)
    idleTimer.current = window.setTimeout(() => {
      p.velocity = 0
      setLens(l => (l && !l.settling ? { ...l, sx: 1, sy: 1 } : l))
    }, STRETCH_IDLE_MS)
  }

  const onPointerUp = (e: ReactPointerEvent<HTMLElement>) => {
    const p = press.current
    if (!p || e.pointerId !== p.id) return
    clearTimers()
    press.current = null
    if (!p.active) return // 轻点：交给 NavLink 的 click
    // 拖动结束后浏览器仍会补发 click，落点可能是另一个 Tab，统一拦掉
    suppressClick.current = true
    const x = clampLensCenter(e.clientX - p.barLeft, p.barWidth, tabs.length)
    const idx = tabIndexAt(x, p.barWidth, tabs.length)
    setLens({ settling: true, cx: tabCenter(idx, p.barWidth, tabs.length), barWidth: p.barWidth, sx: 1, sy: 1 })
    settleTimer.current = window.setTimeout(() => setLens(null), SETTLE_MS)
    if (tabs[idx].to !== pathname) navigate(tabs[idx].to)
  }

  const onPointerCancel = (e: ReactPointerEvent<HTMLElement>) => {
    if (!press.current || e.pointerId !== press.current.id) return
    clearTimers()
    press.current = null
    setLens(null)
  }

  const onClickCapture = (e: ReactMouseEvent) => {
    if (!suppressClick.current) return
    suppressClick.current = false
    e.preventDefault()
    e.stopPropagation()
  }

  const lensWidth = lens ? (lens.barWidth / tabs.length) * LENS_WIDTH_RATIO : 0
  const lensLeft = lens ? lens.cx - lensWidth / 2 : 0
  const hovered = lens ? tabIndexAt(lens.cx, lens.barWidth, tabs.length) : -1

  return (
    <nav
      className="tab-bar"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onClickCapture={onClickCapture}
    >
      {tabs.map(t => (
        <NavLink
          key={t.to}
          to={t.to}
          end={t.to === '/'}
          className={({ isActive }) => `tab-item ${isActive ? 'active' : ''}`}
        >
          <TabContent tab={t} />
        </NavLink>
      ))}
      {lens && (
        <div
          className={`tab-lens${lens.settling ? ' settling' : ''}`}
          aria-hidden="true"
          data-testid="tab-lens"
          style={{ width: lensWidth, transform: `translateX(${lensLeft}px)` }}
        >
          <div
            className="tab-lens-body"
            style={{ '--lens-sx': lens.sx, '--lens-sy': lens.sy } as CSSProperties}
          >
            <div
              className="tab-lens-content"
              style={{
                width: lens.barWidth,
                transformOrigin: `${lens.cx}px 50%`,
                transform: `translateX(${-lensLeft}px) scale(${LENS_ZOOM})`
              }}
            >
              {tabs.map((t, i) => (
                <span key={t.to} className={`tab-item ${i === hovered ? 'active' : ''}`}>
                  <TabContent tab={t} />
                </span>
              ))}
            </div>
            <span className="tab-lens-rim" />
          </div>
        </div>
      )}
    </nav>
  )
}
