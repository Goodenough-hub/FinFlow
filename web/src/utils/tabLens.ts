// 底栏玻璃透镜（仿支付宝 / iOS 液态玻璃）的几何计算。坐标均相对底栏左边缘。

/** 透镜宽度相对单个 Tab 的倍数：比 Tab 宽一截、盖住相邻 Tab 的边，形状接近支付宝的扁胶囊 */
export const LENS_WIDTH_RATIO = 1.3
/** 透镜内容放大倍数 */
export const LENS_ZOOM = 1.2
/** 透镜随手速横向拉伸的上限（1 + MAX_STRETCH） */
export const MAX_STRETCH = 0.15
const STRETCH_PER_SPEED = 0.08 // 每 1px/ms 的拉伸量

/** 透镜中心只能落在首尾两个 Tab 的中心之间，滑出底栏两端时停在端点 */
export function clampLensCenter(x: number, barWidth: number, tabCount: number): number {
  const half = barWidth / tabCount / 2
  return Math.min(Math.max(x, half), barWidth - half)
}

/** 坐标 x 落在哪个 Tab 上（越界按首尾算） */
export function tabIndexAt(x: number, barWidth: number, tabCount: number): number {
  const idx = Math.floor(x / (barWidth / tabCount))
  return Math.min(Math.max(idx, 0), tabCount - 1)
}

/** 第 index 个 Tab 的中心坐标，松手吸附用 */
export function tabCenter(index: number, barWidth: number, tabCount: number): number {
  return (index + 0.5) * (barWidth / tabCount)
}

/**
 * 手速（px/ms，带方向）换算成透镜的横向拉伸与纵向收缩，模拟液体被拖动时的形变。
 * 纵向按横向增量的一半收缩，维持「体积感」。
 */
export function stretchFromVelocity(velocity: number): { x: number; y: number } {
  const s = Math.min(Math.abs(velocity) * STRETCH_PER_SPEED, MAX_STRETCH)
  return { x: 1 + s, y: 1 - s / 2 }
}
