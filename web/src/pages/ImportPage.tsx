import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Account, Category, Transaction, TransactionType } from '../db/models'
import { parseCSV, buildTemplateCSV, type ParsedRow } from '../utils/csv'
import { asCurrency } from '../utils/format'
import { useQuery } from '../hooks/useQuery'
import { useCategories, useAccounts, refreshCategories } from '../hooks/useLookup'
import { transactionsApi, categoriesApi } from '../api/finflow'
import './ImportPage.css'

type Phase = 'pick' | 'preview' | 'done'

interface ImportResult {
  total: number
  imported: number
  skipped: number
  newCategories: string[]
}

export default function ImportPage() {
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)

  const { list: allCategories = [] } = useCategories()
  const { list: allAccounts = [] } = useAccounts()
  const { data: existingTx = [] } = useQuery(() => transactionsApi.list(), [])

  const [phase, setPhase] = useState<Phase>('pick')
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [skipDuplicates, setSkipDuplicates] = useState(true)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [importing, setImporting] = useState(false)

  const preview = useMemo(() => rows.slice(0, 8), [rows])
  const warningCount = useMemo(() => rows.filter(r => r.warnings.length > 0).length, [rows])

  const handleFile = async (file: File) => {
    const text = await file.text()
    const r = parseCSV(text)
    setRows(r.rows)
    setErrors(r.errors)
    setPhase('preview')
  }

  const handleDownloadTemplate = () => {
    const blob = new Blob(['﻿' + buildTemplateCSV()], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'finflow-template.csv'
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const handleImport = async () => {
    if (importing) return
    setImporting(true)
    try {
      const catByName = new Map<string, Category>()
      for (const c of allCategories) catByName.set(c.name, c)
      const accByName = new Map<string, Account>()
      for (const a of allAccounts) accByName.set(a.name, a)

      const existingKeys = new Set<string>()
      for (const t of existingTx) {
        existingKeys.add(`${t.date}|${t.amount}|${t.type}|${t.note ?? ''}`)
      }

      const newCategories: string[] = []
      const toAdd: Transaction[] = []
      let imported = 0
      let skipped = 0

      for (const r of rows) {
        if (!r.date || !Number.isFinite(r.amount) || r.amount <= 0) {
          skipped++
          continue
        }
        if (skipDuplicates && existingKeys.has(`${r.date}|${r.amount}|${r.type}|${r.note ?? ''}`)) {
          skipped++
          continue
        }

        let categoryId: string | undefined
        if (r.categoryName) {
          let cat = catByName.get(r.categoryName)
          if (!cat) {
            const type: TransactionType = r.type === 'income' ? 'income' : 'expense'
            const sameTypeCount = allCategories.filter(c => c.type === type).length
            cat = await categoriesApi.create({
              name: r.categoryName,
              type,
              icon: '🏷',
              colorHex: '#5B8DEF',
              sortOrder: sameTypeCount,
              isSystem: false
            })
            allCategories.push(cat)
            catByName.set(cat.name, cat)
            newCategories.push(cat.name)
          }
          categoryId = cat.id
        }

        let accountId: string | undefined
        if (r.accountName) {
          accountId = accByName.get(r.accountName)?.id
        }
        let toAccountId: string | undefined
        if (r.toAccountName) {
          toAccountId = accByName.get(r.toAccountName)?.id
        }

        toAdd.push({
          id: '',
          amount: r.amount,
          type: r.type,
          note: r.note ?? '',
          date: r.date,
          time: r.time,
          createdAt: new Date().toISOString(),
          categoryId,
          accountId,
          toAccountId,
          vendor: r.vendor
        })
        imported++
      }

      for (const t of toAdd) {
        await transactionsApi.create(t)
      }
      if (newCategories.length > 0) {
        await refreshCategories()
      }

      setResult({
        total: rows.length,
        imported,
        skipped,
        newCategories
      })
      setPhase('done')
    } finally {
      setImporting(false)
    }
  }

  const handleReset = () => {
    setPhase('pick')
    setRows([])
    setErrors([])
    setResult(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="page import-page">
      <header className="form-header">
        <button className="form-header-btn" onClick={() => navigate(-1)}>返回</button>
        <span className="form-title">导入 CSV</span>
        <span className="form-header-spacer" />
      </header>

      {phase === 'pick' && (
        <div className="import-body">
          <div className="card import-hint">
            <div className="hint-title">支持的格式</div>
            <p>第一行为表头，必须包含「日期」和「金额」两列。可选列：类型、分类、账户、商家、备注。</p>
            <button className="template-btn" onClick={handleDownloadTemplate}>
              下载模板 CSV
            </button>
          </div>

          <label className="card file-picker">
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              onChange={e => {
                const f = e.target.files?.[0]
                if (f) handleFile(f)
              }}
              hidden
            />
            <div className="file-icon">📥</div>
            <div className="file-text">选择 CSV 文件</div>
            <div className="file-hint">UTF-8 编码，最大 10MB</div>
          </label>

          <div className="card format-example">
            <div className="example-title">格式示例</div>
            <pre className="example-code">{buildTemplateCSV()}</pre>
          </div>
        </div>
      )}

      {phase === 'preview' && (
        <div className="import-body">
          {errors.length > 0 && (
            <div className="card import-errors">
              {errors.map((e, i) => (
                <div key={i} className="error-line">⚠ {e}</div>
              ))}
            </div>
          )}

          <div className="card preview-summary">
            <div className="summary-line">
              <span>解析到</span>
              <strong>{rows.length}</strong>
              <span>条交易</span>
            </div>
            {warningCount > 0 && (
              <div className="summary-line warn">
                <span>其中</span>
                <strong>{warningCount}</strong>
                <span>条有警告（仍可导入，会按规则处理）</span>
              </div>
            )}
            <label className="dup-toggle">
              <input
                type="checkbox"
                checked={skipDuplicates}
                onChange={e => setSkipDuplicates(e.target.checked)}
              />
              <span>跳过重复交易（日期 + 金额 + 类型 + 备注 完全相同）</span>
            </label>
          </div>

          <div className="card preview-table">
            <div className="preview-row preview-head">
              <span>日期</span>
              <span>类型</span>
              <span>金额</span>
              <span>分类</span>
              <span>账户</span>
            </div>
            {preview.map((r, i) => (
              <div key={i} className="preview-row">
                <span>{r.date || '—'}</span>
                <span>{r.type === 'income' ? '收入' : r.type === 'expense' ? '支出' : '转账'}</span>
                <span className="amount">{asCurrency(r.amount)}</span>
                <span>{r.categoryName ?? '—'}</span>
                <span>{r.accountName ?? '—'}</span>
              </div>
            ))}
            {rows.length > preview.length && (
              <div className="preview-more">
                还有 {rows.length - preview.length} 条，导入后可见
              </div>
            )}
          </div>

          <div className="import-actions">
            <button className="action-cancel" onClick={handleReset} disabled={importing}>
              取消
            </button>
            <button className="action-confirm" onClick={handleImport} disabled={importing || rows.length === 0}>
              {importing ? '导入中…' : `导入 ${rows.length} 条`}
            </button>
          </div>
        </div>
      )}

      {phase === 'done' && result && (
        <div className="import-body">
          <div className="card done-card">
            <div className="done-icon">✅</div>
            <div className="done-title">导入完成</div>
            <div className="done-stats">
              <div className="done-stat">
                <span>总条数</span>
                <strong>{result.total}</strong>
              </div>
              <div className="done-stat">
                <span>已导入</span>
                <strong className="ok">{result.imported}</strong>
              </div>
              <div className="done-stat">
                <span>已跳过</span>
                <strong>{result.skipped}</strong>
              </div>
            </div>
            {result.newCategories.length > 0 && (
              <div className="new-cats">
                <div className="new-cats-title">新建分类（{result.newCategories.length}）</div>
                <div className="new-cats-list">
                  {result.newCategories.map(n => (
                    <span key={n} className="new-cat-chip">{n}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="import-actions">
            <button className="action-cancel" onClick={handleReset}>再导入一份</button>
            <button className="action-confirm" onClick={() => navigate('/transactions')}>查看账单</button>
          </div>
        </div>
      )}
    </div>
  )
}
