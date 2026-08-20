// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import CategoryIcon, { categoryIconUrl } from './CategoryIcon'

afterEach(cleanup)

describe('CategoryIcon 品牌资源路径', () => {
  it.each([
    ['brand:jd', 'jd.ico'],
    ['brand:taobao', 'taobao.ico'],
    ['brand:douyin', 'douyin.ico'],
  ])('%s 使用 FinFlow base 路径', (icon, filename) => {
    expect(categoryIconUrl(filename, '/finflow/'))
      .toBe(`/finflow/icons/categories/${filename}`)

    const { container } = render(<CategoryIcon icon={icon} color="#000000" />)
    expect(container.querySelector('img')?.getAttribute('src'))
      .toBe(categoryIconUrl(filename))
  })

  it('SVG mask 同样使用 FinFlow base 路径', () => {
    expect(categoryIconUrl('pinduoduo.svg', '/finflow'))
      .toBe('/finflow/icons/categories/pinduoduo.svg')

    const { container } = render(<CategoryIcon icon="brand:pinduoduo" color="#000000" />)
    const mask = container.querySelector('span > span') as HTMLSpanElement
    expect(mask.style.maskImage).toContain(categoryIconUrl('pinduoduo.svg'))
  })
})
