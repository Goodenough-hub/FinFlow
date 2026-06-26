import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'

export default function SettingsPage() {
  const txCount = useLiveQuery(() => db.transactions.count(), [], 0)
  const catCount = useLiveQuery(() => db.categories.count(), [], 0)
  const accCount = useLiveQuery(() => db.accounts.count(), [], 0)

  return (
    <div className="page">
      <header className="page-header">
        <h1>设置</h1>
      </header>
      <section className="card">
        <div className="row">
          <span>交易数</span>
          <strong>{txCount}</strong>
        </div>
        <div className="row">
          <span>分类数</span>
          <strong>{catCount}</strong>
        </div>
        <div className="row">
          <span>账户数</span>
          <strong>{accCount}</strong>
        </div>
      </section>
      <div className="placeholder">
        <p className="hint">外观、CSV 导入导出、填充测试数据 — 待实现</p>
      </div>
    </div>
  )
}
