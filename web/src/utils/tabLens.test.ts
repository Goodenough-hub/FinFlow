import { describe, it, expect } from 'vitest'
import { clampLensCenter, tabIndexAt, tabCenter, stretchFromVelocity, MAX_STRETCH } from './tabLens'

// 底栏宽 400、4 个 Tab：每个 100，中心分别在 50/150/250/350
describe('clampLensCenter', () => {
  it('底栏中间的坐标原样返回', () => {
    expect(clampLensCenter(200, 400, 4)).toBe(200)
  })
  it('滑出左右两端时停在首尾 Tab 的中心', () => {
    expect(clampLensCenter(-30, 400, 4)).toBe(50)
    expect(clampLensCenter(10, 400, 4)).toBe(50)
    expect(clampLensCenter(390, 400, 4)).toBe(350)
    expect(clampLensCenter(999, 400, 4)).toBe(350)
  })
})

describe('tabIndexAt', () => {
  it('按坐标落点取 Tab，边界属于右侧 Tab', () => {
    expect(tabIndexAt(0, 400, 4)).toBe(0)
    expect(tabIndexAt(99.9, 400, 4)).toBe(0)
    expect(tabIndexAt(100, 400, 4)).toBe(1)
    expect(tabIndexAt(260, 400, 4)).toBe(2)
  })
  it('越界按首尾 Tab 算', () => {
    expect(tabIndexAt(-5, 400, 4)).toBe(0)
    expect(tabIndexAt(400, 400, 4)).toBe(3)
    expect(tabIndexAt(1000, 400, 4)).toBe(3)
  })
})

describe('tabCenter', () => {
  it('返回 Tab 中心，可作为松手吸附目标', () => {
    expect(tabCenter(0, 400, 4)).toBe(50)
    expect(tabCenter(2, 400, 4)).toBe(250)
  })
})

describe('stretchFromVelocity', () => {
  it('静止时不变形', () => {
    expect(stretchFromVelocity(0)).toEqual({ x: 1, y: 1 })
  })
  it('向左向右同样拉伸，纵向收缩为横向增量的一半', () => {
    const r = stretchFromVelocity(1)
    expect(stretchFromVelocity(-1)).toEqual(r)
    expect(r.x).toBeGreaterThan(1)
    expect(1 - r.y).toBeCloseTo((r.x - 1) / 2)
  })
  it('甩得再快也不超过拉伸上限', () => {
    expect(stretchFromVelocity(50).x).toBeCloseTo(1 + MAX_STRETCH)
    expect(stretchFromVelocity(50).y).toBeCloseTo(1 - MAX_STRETCH / 2)
  })
})
