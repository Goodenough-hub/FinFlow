import type { StatPeriod } from '../utils/date'
import { isCurrent, monthYearString, stepPeriod, yearString } from '../utils/date'
import './PeriodPicker.css'

interface Props {
  period: StatPeriod
  date: Date
  onPeriodChange: (p: StatPeriod) => void
  onDateChange: (d: Date) => void
}

export default function PeriodPicker({ period, date, onPeriodChange, onDateChange }: Props) {
  const current = isCurrent(date, period)
  const title = period === 'month' ? monthYearString(date) : yearString(date)

  return (
    <div className="period-picker">
      <div className="period-segmented">
        <button
          className={period === 'month' ? 'active' : ''}
          onClick={() => onPeriodChange('month')}
        >
          月
        </button>
        <button
          className={period === 'year' ? 'active' : ''}
          onClick={() => onPeriodChange('year')}
        >
          年
        </button>
      </div>
      <div className="period-nav">
        <button
          className="period-arrow"
          onClick={() => onDateChange(stepPeriod(date, period, -1))}
          aria-label="上一期"
        >
          ‹
        </button>
        <span className="period-title">{title}</span>
        <button
          className="period-arrow"
          onClick={() => onDateChange(stepPeriod(date, period, 1))}
          disabled={current}
          aria-label="下一期"
        >
          ›
        </button>
      </div>
    </div>
  )
}
