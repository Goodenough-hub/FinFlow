// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import NumericKeypad from './NumericKeypad'

afterEach(cleanup)

describe('NumericKeypad 触摸输入', () => {
  it('数字键保持标准点击行为，一次点击只输入一次', () => {
    const onChange = vi.fn()
    render(<NumericKeypad value="" onChange={onChange} />)
    const key = screen.getByRole('button', { name: '1' })

    expect(fireEvent.pointerDown(key)).toBe(true)
    fireEvent.pointerUp(key)
    fireEvent.click(key)

    expect(onChange).toHaveBeenCalledWith('1')
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('退格键删除末位数字', () => {
    const onChange = vi.fn()
    render(<NumericKeypad value="12" onChange={onChange} />)

    fireEvent.click(screen.getByRole('button', { name: '退格' }))

    expect(onChange).toHaveBeenCalledWith('1')
  })
})
