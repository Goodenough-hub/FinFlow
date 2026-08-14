import type { CSSProperties } from 'react'
import { parseBrand } from '../utils/categoryBrand'

interface Props {
  icon: string
  color: string
  size?: number
}

export default function CategoryIcon({ icon, color, size = 36 }: Props) {
  const brand = parseBrand(icon)

  // 品牌图标：容器 tint 换成品牌色，svg 走 mask 单色填充为品牌色，否则 monogram
  if (brand) {
    const radius = size * 0.28
    if (brand.svg) {
      const maskSize = size * 0.6
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
      // WebKit mask + background-color 让 simple-icons 黑色单色 SVG 显示为品牌色
      const svgStyle: CSSProperties = {
        width: maskSize,
        height: maskSize,
        backgroundColor: brand.color,
        WebkitMaskImage: `url(/icons/categories/${brand.svg}.svg)`,
        WebkitMaskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center',
        WebkitMaskSize: 'contain',
        maskImage: `url(/icons/categories/${brand.svg}.svg)`,
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
    // Monogram 兜底：品牌色实心 + 白字
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

  // 兜底：原 emoji/文字渲染，保持向后兼容
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
