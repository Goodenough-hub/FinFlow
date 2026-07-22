import type { Trip, Category, CategoryType, Transaction } from '../db/models'

// 删除旅游的确认文案。抽出共享，避免 TripPickerDialog / TripListPage 各写一份。
// 交易表的 trip_id 外键是 ON DELETE SET NULL，删除旅游不会删交易，仅解除关联。
export function tripDeleteConfirmText(name: string): string {
  return `删除旅游「${name}」？关联交易保留（仅脱离该旅游）。`
}

// 行程日期区间的展示文案：有则「开始 ~ 结束」，缺一端只显示另一端，都没有则「未设日期」。
export function tripDateRangeText(trip: Pick<Trip, 'startDate' | 'endDate'>): string {
  return [trip.startDate, trip.endDate].filter(Boolean).join(' ~ ') || '未设日期'
}

export interface TripCategoryGroup {
  group: Category
  children: Category[]
}

// 把旅游专属分类（scope='trip'）按「组 + 叶子」两层整理：
// 组是 parentId 为空的 trip 分类，children 是挂在其下的叶子，均按 sortOrder 升序。
// 只保留与 type 匹配的分类；记账时用户在叶子上选择。
export function getTripCategoryGroups(cats: Category[], type: CategoryType): TripCategoryGroup[] {
  const trip = cats.filter(c => c.scope === 'trip' && c.type === type)
  const groups = trip.filter(c => !c.parentId).sort((a, b) => a.sortOrder - b.sortOrder)
  return groups.map(g => ({
    group: g,
    children: trip
      .filter(c => c.parentId === g.id)
      .sort((a, b) => a.sortOrder - b.sortOrder),
  }))
}

export interface TripGroupTotal {
  group: Category
  total: number
}

// 报告用：把一批交易按「分类组」汇总支出。
// 叶子交易归到其 parent 组；若交易直接落在组上（历史数据）或无 parent，则用自身。
// 返回按金额降序。
export function aggregateTripByGroup(
  txs: Array<Pick<Transaction, 'amount' | 'type' | 'categoryId'>>,
  catById: Map<string, Category>,
): TripGroupTotal[] {
  const totals = new Map<string, number>()
  const groupById = new Map<string, Category>()
  for (const t of txs) {
    if (t.type !== 'expense' || !t.categoryId) continue
    const leaf = catById.get(t.categoryId)
    if (!leaf) continue
    const group = leaf.parentId ? (catById.get(leaf.parentId) ?? leaf) : leaf
    totals.set(group.id, (totals.get(group.id) ?? 0) + t.amount)
    groupById.set(group.id, group)
  }
  return Array.from(totals.entries())
    .map(([gid, total]) => ({ group: groupById.get(gid)!, total }))
    .sort((a, b) => b.total - a.total)
}
