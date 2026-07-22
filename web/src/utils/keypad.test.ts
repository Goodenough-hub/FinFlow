import { describe, it, expect } from 'vitest'
import { applyKeypadKey } from './keypad'

describe('applyKeypadKey', () => {
  it('从空开始输入数字', () => {
    expect(applyKeypadKey('', '5')).toBe('5')
  })

  it('输入小数点与两位小数', () => {
    expect(applyKeypadKey('5', '.')).toBe('5.')
    expect(applyKeypadKey('5.', '2')).toBe('5.2')
    expect(applyKeypadKey('5.2', '3')).toBe('5.23')
  })

  it('小数位超过两位被忽略', () => {
    expect(applyKeypadKey('5.23', '4')).toBe('5.23')
  })

  it('空串按小数点补前导零', () => {
    expect(applyKeypadKey('', '.')).toBe('0.')
  })

  it('已有小数点再按点被忽略', () => {
    expect(applyKeypadKey('5.2', '.')).toBe('5.2')
  })

  it('单独的 0 后按数字替换而非拼成 00/07', () => {
    expect(applyKeypadKey('0', '0')).toBe('0')
    expect(applyKeypadKey('0', '7')).toBe('7')
  })

  it('0 后按小数点变 0.', () => {
    expect(applyKeypadKey('0', '.')).toBe('0.')
  })

  it('退格删末位，删空得空串', () => {
    expect(applyKeypadKey('12.3', 'back')).toBe('12.')
    expect(applyKeypadKey('5', 'back')).toBe('')
    expect(applyKeypadKey('', 'back')).toBe('')
  })

  it('清零', () => {
    expect(applyKeypadKey('12.34', 'clear')).toBe('')
  })

  it('整数位达到上限后忽略', () => {
    expect(applyKeypadKey('12345678', '9')).toBe('12345678')
  })

  it('非法键原样返回', () => {
    expect(applyKeypadKey('12', 'x')).toBe('12')
  })
})
