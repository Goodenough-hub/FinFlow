import { describe, it, expect } from 'vitest'
import { CATEGORY_BRANDS, CATEGORY_NAME_TO_BRAND, parseBrand } from './categoryBrand'

describe('categoryBrand', () => {
  it('name→brand 映射的每个 slug 都在 CATEGORY_BRANDS 中注册', () => {
    for (const [name, slug] of Object.entries(CATEGORY_NAME_TO_BRAND)) {
      expect(CATEGORY_BRANDS[slug], `${name} → ${slug} 未在 CATEGORY_BRANDS 注册`).toBeDefined()
    }
  })

  it('每个 brand 至少有 logo / svg / mono 之一', () => {
    for (const [slug, brand] of Object.entries(CATEGORY_BRANDS)) {
      expect(brand.logo || brand.svg || brand.mono, `${slug} 无任何可渲染字段`).toBeTruthy()
    }
  })

  it('logo 文件名带合法扩展名（png/ico/jpg/svg）', () => {
    for (const [slug, brand] of Object.entries(CATEGORY_BRANDS)) {
      if (!brand.logo) continue
      expect(brand.logo, `${slug} logo 扩展名非法: ${brand.logo}`).toMatch(/\.(png|ico|jpg|svg)$/)
    }
  })

  it('parseBrand 识别 brand: 前缀', () => {
    expect(parseBrand('brand:jd')?.name).toBe('京东')
    expect(parseBrand('brand:steam')?.logo).toBe('steam.png')
  })

  it('parseBrand 对未知 slug / 非 brand 前缀返回 null', () => {
    expect(parseBrand('brand:not-exist')).toBeNull()
    expect(parseBrand('📦')).toBeNull()
    expect(parseBrand('')).toBeNull()
  })

  it('每个品牌色是合法 hex', () => {
    for (const [slug, brand] of Object.entries(CATEGORY_BRANDS)) {
      expect(brand.color, `${slug} color 不合法`).toMatch(/^#[0-9A-Fa-f]{6}$/)
    }
  })
})
