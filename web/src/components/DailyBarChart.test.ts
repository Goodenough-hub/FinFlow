import { describe, expect, it } from 'vitest'
import { formatTrendTooltip } from './DailyBarChart'

describe('DailyBarChart tooltip', () => {
  it('只显示数据点中的金额，不把日期坐标拼入金额', () => {
    const result = formatTrendTooltip([
      { axisValue: 23, seriesName: '收入', value: [23, 1234.56] },
      { axisValue: 23, seriesName: '支出', value: [23, 88] }
    ], '日')

    expect(result).toBe('日 23<br/>收入: ¥1,234.56<br/>支出: ¥88')
  })

  it('正确显示零金额', () => {
    const result = formatTrendTooltip([
      { axisValue: 1, seriesName: '收入', value: [1, 0] }
    ], '月')

    expect(result).toBe('月 1<br/>收入: ¥0')
  })
})
