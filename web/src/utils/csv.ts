export interface ParsedRow {
  raw: string[]
  date: string
  time?: string
  type: 'income' | 'expense' | 'transfer'
  amount: number
  categoryName?: string
  accountName?: string
  toAccountName?: string
  vendor?: string
  note?: string
  warnings: string[]
}

export interface ParseResult {
  rows: ParsedRow[]
  totalLines: number
  errors: string[]
}

const TYPE_MAP: Record<string, ParsedRow['type']> = {
  '支出': 'expense',
  'expense': 'expense',
  '收入': 'income',
  'income': 'income',
  '转账': 'transfer',
  'transfer': 'transfer'
}

const HEADER_ALIASES: Record<string, keyof ParsedRow> = {
  '日期': 'date',
  'date': 'date',
  '时间': 'time',
  'time': 'time',
  '类型': 'type',
  'type': 'type',
  '金额': 'amount',
  'amount': 'amount',
  '分类': 'categoryName',
  '类别': 'categoryName',
  'category': 'categoryName',
  '账户': 'accountName',
  'account': 'accountName',
  '转出账户': 'accountName',
  '转入账户': 'toAccountName',
  '商家': 'vendor',
  'vendor': 'vendor',
  '备注': 'note',
  'note': 'note',
  '备注说明': 'note',
  '描述': 'note'
}

export function parseCSV(text: string): ParseResult {
  const lines = splitLines(text)
  const errors: string[] = []
  if (lines.length === 0) {
    return { rows: [], totalLines: 0, errors: ['空文件'] }
  }

  const headerCells = parseLine(lines[0])
  const columnIndex: Partial<Record<keyof ParsedRow, number>> = {}
  headerCells.forEach((h, i) => {
    const key = HEADER_ALIASES[h.trim().toLowerCase()]
    if (key && !(key in columnIndex)) {
      columnIndex[key] = i
    }
  })

  if (columnIndex.date === undefined || columnIndex.amount === undefined) {
    return {
      rows: [],
      totalLines: lines.length,
      errors: ['缺少必要列：日期、金额。请检查表头格式。']
    }
  }

  const rows: ParsedRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    if (!line.trim()) continue
    const cells = parseLine(line)
    const raw = cells
    const warnings: string[] = []

    const dateRaw = cells[columnIndex.date!]?.trim() ?? ''
    const date = normalizeDate(dateRaw)
    if (!date) warnings.push(`日期格式异常：${dateRaw}`)

    const timeRaw = columnIndex.time !== undefined
      ? cells[columnIndex.time]?.trim() ?? ''
      : ''
    const time = normalizeTime(timeRaw)

    const amountRaw = (cells[columnIndex.amount!] ?? '').trim().replace(/[¥,]/g, '')
    const amount = parseFloat(amountRaw)
    if (!Number.isFinite(amount) || amount < 0) warnings.push(`金额异常：${amountRaw}`)

    let type: ParsedRow['type'] = 'expense'
    if (columnIndex.type !== undefined) {
      const t = cells[columnIndex.type]?.trim() ?? ''
      type = TYPE_MAP[t.toLowerCase()] ?? 'expense'
      if (!TYPE_MAP[t.toLowerCase()] && t) warnings.push(`类型未知：${t}，按支出处理`)
    } else {
      const negative = amountRaw.startsWith('-')
      type = negative ? 'expense' : 'expense'
    }

    const categoryName = columnIndex.categoryName !== undefined
      ? cells[columnIndex.categoryName]?.trim() || undefined
      : undefined
    const accountName = columnIndex.accountName !== undefined
      ? cells[columnIndex.accountName]?.trim() || undefined
      : undefined
    const toAccountName = columnIndex.toAccountName !== undefined
      ? cells[columnIndex.toAccountName]?.trim() || undefined
      : undefined
    const vendor = columnIndex.vendor !== undefined
      ? cells[columnIndex.vendor]?.trim() || undefined
      : undefined
    const note = columnIndex.note !== undefined
      ? cells[columnIndex.note]?.trim() || undefined
      : undefined

    rows.push({
      raw,
      date,
      time,
      type,
      amount,
      categoryName,
      accountName,
      toAccountName,
      vendor,
      note,
      warnings
    })
  }

  return { rows, totalLines: lines.length, errors }
}

function splitLines(text: string): string[] {
  const normalized = text.replace(/^﻿/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  return normalized.split('\n')
}

function parseLine(line: string): string[] {
  const cells: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        cur += c
      }
    } else {
      if (c === ',') {
        cells.push(cur)
        cur = ''
      } else if (c === '"') {
        inQuotes = true
      } else {
        cur += c
      }
    }
  }
  cells.push(cur)
  return cells
}

function normalizeDate(s: string): string {
  if (!s) return ''
  const m1 = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/)
  if (m1) {
    const y = m1[1]
    const m = m1[2].padStart(2, '0')
    const d = m1[3].padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  const m2 = s.match(/^(\d{4})年(\d{1,2})月(\d{1,2})日/)
  if (m2) {
    return `${m2[1]}-${m2[2].padStart(2, '0')}-${m2[3].padStart(2, '0')}`
  }
  return ''
}

function normalizeTime(s: string): string | undefined {
  if (!s) return undefined
  const m = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/)
  if (m) {
    return `${m[1].padStart(2, '0')}:${m[2]}`
  }
  return undefined
}

export function buildTemplateCSV(): string {
  const header = '日期,时间,类型,金额,分类,账户,商家,备注'
  const sample = [
    '2026-06-15,12:30,支出,25.5,午餐,支付宝,,公司食堂',
    '2026-06-15,09:00,收入,5000,工资,支付宝,,6月工资',
    '2026-06-16,18:45,支出,80,打车,微信,高德,机场通勤'
  ]
  return [header, ...sample].join('\n')
}
