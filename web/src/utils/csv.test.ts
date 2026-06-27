import { describe, it, expect } from 'vitest'
import { parseCSV, buildTemplateCSV } from './csv'

describe('csv utils', () => {
  describe('buildTemplateCSV', () => {
    it('包含中文表头', () => {
      const tpl = buildTemplateCSV()
      const header = tpl.split('\n')[0]
      expect(header).toBe('日期,时间,类型,金额,分类,账户,商家,备注')
    })

    it('包含三行示例', () => {
      const lines = buildTemplateCSV().split('\n')
      expect(lines.length).toBe(4)
      expect(lines[1]).toContain('支出')
      expect(lines[2]).toContain('收入')
      expect(lines[3]).toContain('打车')
    })

    it('自身可被 parseCSV 解析', () => {
      const result = parseCSV(buildTemplateCSV())
      expect(result.errors).toEqual([])
      expect(result.rows.length).toBe(3)
    })
  })

  describe('parseCSV', () => {
    it('空文件返回错误', () => {
      const r = parseCSV('')
      expect(r.rows).toEqual([])
      expect(r.errors).toContain('空文件')
    })

    it('缺少必要列返回错误', () => {
      const r = parseCSV('分类,金额\n午餐,25')
      expect(r.rows).toEqual([])
      expect(r.errors[0]).toMatch(/缺少必要列/)
    })

    it('解析标准中文表头', () => {
      const r = parseCSV('日期,时间,类型,金额,分类,账户,商家,备注\n2026-06-15,12:30,支出,25.5,午餐,支付宝,,公司食堂')
      expect(r.rows.length).toBe(1)
      const row = r.rows[0]
      expect(row.date).toBe('2026-06-15')
      expect(row.time).toBe('12:30')
      expect(row.type).toBe('expense')
      expect(row.amount).toBe(25.5)
      expect(row.categoryName).toBe('午餐')
      expect(row.accountName).toBe('支付宝')
      expect(row.vendor).toBeUndefined()
      expect(row.note).toBe('公司食堂')
    })

    it('解析英文表头', () => {
      const r = parseCSV('date,type,amount,category\n2026-06-15,income,5000,工资')
      expect(r.rows[0].type).toBe('income')
      expect(r.rows[0].amount).toBe(5000)
    })

    it('金额带 ¥ 和千分位也能解析', () => {
      const r = parseCSV('日期,金额\n2026-06-15,"¥1,234.56"')
      expect(r.rows[0].amount).toBe(1234.56)
    })

    it('日期支持多种分隔符', () => {
      const r1 = parseCSV('日期,金额\n2026/06/15,100')
      expect(r1.rows[0].date).toBe('2026-06-15')
      const r2 = parseCSV('日期,金额\n2026.6.5,100')
      expect(r2.rows[0].date).toBe('2026-06-05')
      const r3 = parseCSV('日期,金额\n2026年6月15日,100')
      expect(r3.rows[0].date).toBe('2026-06-15')
    })

    it('时间字段支持时:分:秒格式（截断为 HH:MM）', () => {
      const r = parseCSV('日期,时间,金额\n2026-06-15,18:45:30,100')
      expect(r.rows[0].time).toBe('18:45')
    })

    it('无效时间返回 undefined', () => {
      const r = parseCSV('日期,时间,金额\n2026-06-15,abc,100')
      expect(r.rows[0].time).toBeUndefined()
    })

    it('未提供时间列时 time 为 undefined', () => {
      const r = parseCSV('日期,金额\n2026-06-15,100')
      expect(r.rows[0].time).toBeUndefined()
    })

    it('类型映射：支出/收入/转账', () => {
      const r = parseCSV('日期,类型,金额\n2026-06-15,支出,10\n2026-06-15,收入,10\n2026-06-15,转账,10')
      expect(r.rows[0].type).toBe('expense')
      expect(r.rows[1].type).toBe('income')
      expect(r.rows[2].type).toBe('transfer')
    })

    it('未知类型按支出处理并加警告', () => {
      const r = parseCSV('日期,类型,金额\n2026-06-15,其他,10')
      expect(r.rows[0].type).toBe('expense')
      expect(r.rows[0].warnings.some(w => w.includes('类型未知'))).toBe(true)
    })

    it('日期异常加警告', () => {
      const r = parseCSV('日期,金额\n无效日期,10')
      expect(r.rows[0].date).toBe('')
      expect(r.rows[0].warnings.some(w => w.includes('日期格式异常'))).toBe(true)
    })

    it('金额异常加警告', () => {
      const r = parseCSV('日期,金额\n2026-06-15,abc')
      expect(r.rows[0].warnings.some(w => w.includes('金额异常'))).toBe(true)
    })

    it('CSV 引号转义：含逗号的字段', () => {
      const r = parseCSV('日期,金额,备注\n2026-06-15,10,"含,逗号"')
      expect(r.rows[0].note).toBe('含,逗号')
    })

    it('CSV 引号转义：含引号的字段', () => {
      const r = parseCSV('日期,金额,备注\n2026-06-15,10,"含""引号"')
      expect(r.rows[0].note).toBe('含"引号')
    })

    it('跳过空行', () => {
      const r = parseCSV('日期,金额\n2026-06-15,10\n\n2026-06-16,20')
      expect(r.rows.length).toBe(2)
    })

    it('BOM 头被剥离', () => {
      const r = parseCSV('﻿日期,金额\n2026-06-15,10')
      expect(r.rows.length).toBe(1)
      expect(r.rows[0].date).toBe('2026-06-15')
    })

    it('CRLF 行尾正常解析', () => {
      const r = parseCSV('日期,金额\r\n2026-06-15,10\r\n')
      expect(r.rows.length).toBe(1)
    })

    it('转出/转入账户别名', () => {
      const r = parseCSV('日期,金额,转出账户,转入账户\n2026-06-15,100,支付宝,微信')
      expect(r.rows[0].accountName).toBe('支付宝')
      expect(r.rows[0].toAccountName).toBe('微信')
    })
  })
})
