import type { CSSProperties } from 'react'
import { parseBrand } from '../utils/categoryBrand'

interface Props {
  icon: string
  color: string
  size?: number
}

export function categoryIconUrl(filename: string, base = import.meta.env.BASE_URL): string {
  const normalizedBase = base.endsWith('/') ? base : `${base}/`
  return `${normalizedBase}icons/categories/${filename}`
}

export default function CategoryIcon({ icon, color, size = 36 }: Props) {
  const brand = parseBrand(icon)

  if (brand) {
    const radius = size * 0.28

    // 优先级 1：真实 logo (多色 PNG/ICO) — 白底容器 + 品牌色淡边，直出 <img>
    if (brand.logo) {
      const imgSize = size * 0.7
      const containerStyle: CSSProperties = {
        width: size,
        height: size,
        background: '#fff',
        borderRadius: radius,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        border: `0.5px solid ${brand.color}55`,
        overflow: 'hidden'
      }
      const imgStyle: CSSProperties = {
        width: imgSize,
        height: imgSize,
        objectFit: 'contain',
        display: 'block'
      }
      return (
        <span style={containerStyle}>
          <img src={categoryIconUrl(brand.logo)} alt="" style={imgStyle} />
        </span>
      )
    }

    // 优先级 2：单色 SVG (currentColor 线稿)，mask 上色为品牌色
    if (brand.svg) {
      const maskSize = size * 0.6
      const maskUrl = categoryIconUrl(`${brand.svg}.svg`)
      const containerStyle: CSSProperties = {
        width: size,
        height: size,
        background: `${brand.color}18`,
        borderRadius: radius,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        border: `0.5px solid ${brand.color}44`,
        overflow: 'hidden'
      }
      const svgStyle: CSSProperties = {
        width: maskSize,
        height: maskSize,
        backgroundColor: brand.color,
        WebkitMaskImage: `url(${maskUrl})`,
        WebkitMaskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center',
        WebkitMaskSize: 'contain',
        maskImage: `url(${maskUrl})`,
        maskRepeat: 'no-repeat',
        maskPosition: 'center',
        maskSize: 'contain'
      }
      return (
        <span style={containerStyle}>
          <span style={svgStyle} aria-hidden="true" />
        </span>
      )
    }

    // 优先级 3：monogram 兜底 — 品牌色实心 + 白字
    const mono = brand.mono ?? '?'
    const monoStyle: CSSProperties = {
      width: size,
      height: size,
      background: brand.color,
      borderRadius: radius,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#fff',
      fontSize: size * (mono.length > 1 ? 0.38 : 0.5),
      fontWeight: 700,
      letterSpacing: '-0.02em',
      lineHeight: 1,
      flexShrink: 0,
      fontFamily: '"PingFang SC", "Hiragino Sans GB", -apple-system, BlinkMacSystemFont, sans-serif'
    }
    return <span style={monoStyle}>{mono}</span>
  }

  // 非品牌 icon：走原 emoji/文字渲染
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
