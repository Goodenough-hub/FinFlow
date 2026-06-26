import { db, uid } from './db'
import type { Category, Account, CategoryType, AccountType } from './models'

interface SeedNode {
  name: string
  icon: string
  color: string
  order: number
  children?: SeedNode[]
}

const expenseTree: SeedNode[] = [
  { name: '餐饮', icon: '🍴', color: '#FF6B35', order: 0, children: [
    { name: '早餐', icon: '🥐', color: '#FF6B35', order: 100 },
    { name: '午餐', icon: '🍱', color: '#F59E0B', order: 101 },
    { name: '晚餐', icon: '🍽️', color: '#EF4444', order: 102 },
    { name: '聚餐AA', icon: '👥', color: '#8B5CF6', order: 103 },
    { name: '聚餐请客', icon: '❤️', color: '#EC4899', order: 104 },
    { name: '其他', icon: '⋯', color: '#6B7280', order: 105 }
  ]},
  { name: '交通', icon: '🚗', color: '#3B82F6', order: 1, children: [
    { name: '地铁', icon: '🚇', color: '#3B82F6', order: 100 },
    { name: '公交', icon: '🚌', color: '#10B981', order: 101 },
    { name: '打车', icon: '🚕', color: '#F59E0B', order: 102 },
    { name: '其他', icon: '⋯', color: '#6B7280', order: 103 }
  ]},
  { name: '购物', icon: '🛍️', color: '#8B5CF6', order: 2, children: [
    { name: '京东', icon: '📦', color: '#EF4444', order: 100 },
    { name: '淘宝', icon: '🛍️', color: '#F59E0B', order: 101 },
    { name: '拼多多', icon: '🛒', color: '#EF4444', order: 102 },
    { name: '抖音', icon: '🎵', color: '#6B7280', order: 103 },
    { name: '其他', icon: '⋯', color: '#6B7280', order: 104 }
  ]},
  { name: '住房', icon: '🏠', color: '#10B981', order: 3, children: [
    { name: '租金', icon: '🔑', color: '#10B981', order: 100 },
    { name: '水电', icon: '⚡', color: '#F59E0B', order: 101 },
    { name: '物业', icon: '🏢', color: '#3B82F6', order: 102 },
    { name: '其他', icon: '⋯', color: '#6B7280', order: 103 }
  ]},
  { name: '娱乐', icon: '🎮', color: '#F59E0B', order: 4, children: [
    { name: '游戏', icon: '🎮', color: '#F59E0B', order: 100, children: [
      { name: '王者荣耀', icon: '👑', color: '#F59E0B', order: 201 },
      { name: '和平精英', icon: '🎯', color: '#10B981', order: 202 },
      { name: '原神', icon: '✨', color: '#3B82F6', order: 203 },
      { name: 'Steam', icon: '🔥', color: '#EF4444', order: 204 },
      { name: '其他', icon: '⋯', color: '#6B7280', order: 205 }
    ]},
    { name: '影视', icon: '🎬', color: '#8B5CF6', order: 200, children: [
      { name: '腾讯视频', icon: '📺', color: '#10B981', order: 301 },
      { name: 'B站', icon: '▶️', color: '#EF4444', order: 302 },
      { name: '爱奇艺', icon: '🎬', color: '#10B981', order: 303 },
      { name: '其他', icon: '⋯', color: '#6B7280', order: 304 }
    ]},
    { name: '音乐', icon: '🎵', color: '#06B6D4', order: 300, children: [
      { name: 'Apple Music', icon: '🎵', color: '#EF4444', order: 401 },
      { name: '网易云音乐', icon: '🎙️', color: '#EF4444', order: 402 },
      { name: 'QQ音乐', icon: '🎶', color: '#3B82F6', order: 403 },
      { name: '其他', icon: '⋯', color: '#6B7280', order: 404 }
    ]},
    { name: '健身', icon: '🏃', color: '#10B981', order: 400, children: [
      { name: '健身房', icon: '🏢', color: '#10B981', order: 601 },
      { name: '私教', icon: '✅', color: '#3B82F6', order: 602 },
      { name: '团课', icon: '👥', color: '#8B5CF6', order: 603 },
      { name: '跑步', icon: '🏃', color: '#F59E0B', order: 604 },
      { name: '游泳', icon: '🏊', color: '#3B82F6', order: 605 },
      { name: '瑜伽', icon: '🧘', color: '#EC4899', order: 606 },
      { name: '其他', icon: '⋯', color: '#6B7280', order: 607 }
    ]},
    { name: '网盘', icon: '☁️', color: '#3B82F6', order: 500, children: [
      { name: '百度网盘', icon: '☁️', color: '#3B82F6', order: 501 },
      { name: '阿里网盘', icon: '☁️', color: '#F59E0B', order: 502 },
      { name: '天翼网盘', icon: '☁️', color: '#EF4444', order: 503 },
      { name: '夸克网盘', icon: '☁️', color: '#8B5CF6', order: 504 },
      { name: '其他', icon: '⋯', color: '#6B7280', order: 505 }
    ]}
  ]},
  { name: '医疗', icon: '⚕️', color: '#EF4444', order: 5, children: [
    { name: '挂号', icon: '⚕️', color: '#EF4444', order: 100 },
    { name: '药品', icon: '💊', color: '#F59E0B', order: 101 },
    { name: '体检', icon: '🩺', color: '#10B981', order: 102 },
    { name: '牙科', icon: '🦷', color: '#3B82F6', order: 103 },
    { name: '眼科', icon: '👁️', color: '#8B5CF6', order: 104 },
    { name: '其他', icon: '⋯', color: '#6B7280', order: 105 }
  ]},
  { name: '教育', icon: '📚', color: '#6366F1', order: 6, children: [
    { name: '培训', icon: '🎓', color: '#6366F1', order: 100 },
    { name: '书籍', icon: '📚', color: '#8B5CF6', order: 101 },
    { name: '学费', icon: '💳', color: '#3B82F6', order: 102 },
    { name: '课程', icon: '📺', color: '#F59E0B', order: 103 },
    { name: '考试报名', icon: '📄', color: '#EF4444', order: 104 },
    { name: '微信读书订阅', icon: '📖', color: '#10B981', order: 105 },
    { name: '其他', icon: '⋯', color: '#6B7280', order: 106 }
  ]},
  { name: '其他', icon: '⋯', color: '#6B7280', order: 7 }
]

const incomeTree: SeedNode[] = [
  { name: '工资', icon: '💰', color: '#10B981', order: 0 },
  { name: '投资', icon: '📈', color: '#3B82F6', order: 1 },
  { name: '兼职', icon: '💼', color: '#8B5CF6', order: 2 },
  { name: '其他收入', icon: '⋯', color: '#6B7280', order: 3 }
]

const defaultAccounts: Array<{ type: AccountType; order: number }> = [
  { type: 'alipay', order: 0 },
  { type: 'wechat', order: 1 },
  { type: 'unionpay', order: 2 },
  { type: 'fixed', order: 3 }
]

const SEED_FLAG_KEY = 'finflow.web.seeded.v1'

function insertTree(
  nodes: SeedNode[],
  parentId: string | undefined,
  type: CategoryType,
  acc: Category[]
): void {
  for (const node of nodes) {
    const id = uid()
    acc.push({
      id,
      name: node.name,
      type,
      icon: node.icon,
      colorHex: node.color,
      sortOrder: node.order,
      isSystem: true,
      parentId
    })
    if (node.children?.length) {
      insertTree(node.children, id, type, acc)
    }
  }
}

export async function seedIfNeeded(): Promise<void> {
  if (localStorage.getItem(SEED_FLAG_KEY)) return

  const existingCats = await db.categories.count()
  if (existingCats > 0) {
    localStorage.setItem(SEED_FLAG_KEY, '1')
    return
  }

  const categories: Category[] = []
  insertTree(expenseTree, undefined, 'expense', categories)
  insertTree(incomeTree, undefined, 'income', categories)

  const accounts: Account[] = defaultAccounts.map(({ type, order }) => ({
    id: uid(),
    name: accountLabel(type),
    type,
    sortOrder: order,
    isSystem: true
  }))

  await db.categories.bulkAdd(categories)
  await db.accounts.bulkAdd(accounts)

  localStorage.setItem(SEED_FLAG_KEY, '1')
}

function accountLabel(type: AccountType): string {
  switch (type) {
    case 'alipay': return '支付宝'
    case 'wechat': return '微信'
    case 'unionpay': return '银行卡'
    case 'fixed': return '定期'
    default: return '其他'
  }
}
