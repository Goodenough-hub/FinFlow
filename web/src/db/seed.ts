import { db, uid } from './db'
import type { Category, Account, CategoryType, AccountType } from './models'
import { accountTypeColor, accountTypeIcon, accountTypeLabel } from './models'

interface SeedNode {
  name: string
  icon: string
  color: string
  order: number
  children?: SeedNode[]
}

export const expenseTree: SeedNode[] = [
  { name: '餐饮', icon: '🍴', color: '#FF6B35', order: 0, children: [
    { name: '早餐', icon: '🥐', color: '#FF6B35', order: 100 },
    { name: '午餐', icon: '🍱', color: '#F59E0B', order: 101 },
    { name: '晚餐', icon: '🍽️', color: '#EF4444', order: 102 },
    { name: '夜宵', icon: '🌙', color: '#6366F1', order: 103 },
    { name: '小吃', icon: '🍡', color: '#8B5CF6', order: 104 },
    { name: '饮料', icon: '🥤', color: '#06B6D4', order: 105 },
    { name: '外卖', icon: '🛵', color: '#F97316', order: 106 },
    { name: '聚餐AA', icon: '👥', color: '#8B5CF6', order: 107 },
    { name: '聚餐请客', icon: '❤️', color: '#EC4899', order: 108 },
    { name: '其他', icon: '⋯', color: '#6B7280', order: 109 }
  ]},
  { name: '交通', icon: '🚗', color: '#3B82F6', order: 1, children: [
    { name: '地铁', icon: '🚇', color: '#3B82F6', order: 100 },
    { name: '公交', icon: '🚌', color: '#10B981', order: 101 },
    { name: '打车', icon: '🚕', color: '#F59E0B', order: 102 },
    { name: '高铁', icon: '🚄', color: '#6366F1', order: 103 },
    { name: '电瓶车充电', icon: '🔋', color: '#10B981', order: 104 },
    { name: '其他', icon: '⋯', color: '#6B7280', order: 105 }
  ]},
  { name: '购物', icon: '🛍️', color: '#8B5CF6', order: 2, children: [
    { name: '京东', icon: 'brand:jd', color: '#E1251B', order: 100 },
    { name: '淘宝', icon: 'brand:taobao', color: '#FF6900', order: 101 },
    { name: '拼多多', icon: 'brand:pinduoduo', color: '#E02E24', order: 102 },
    { name: '抖音', icon: 'brand:douyin', color: '#000000', order: 103 },
    { name: '外卖', icon: '🛵', color: '#F97316', order: 104 },
    { name: '其他', icon: '⋯', color: '#6B7280', order: 105 }
  ]},
  { name: '住房', icon: '🏠', color: '#10B981', order: 3, children: [
    { name: '租金', icon: '🔑', color: '#10B981', order: 100 },
    { name: '水费', icon: '💧', color: '#06B6D4', order: 101 },
    { name: '电费', icon: '⚡', color: '#F59E0B', order: 102 },
    { name: '物业', icon: '🏢', color: '#3B82F6', order: 103 },
    { name: '其他', icon: '⋯', color: '#6B7280', order: 104 }
  ]},
  { name: '娱乐', icon: '🎮', color: '#F59E0B', order: 4, children: [
    { name: '游戏', icon: '🎮', color: '#F59E0B', order: 100, children: [
      { name: '王者荣耀', icon: 'brand:wangzhe', color: '#B99154', order: 201 },
      { name: '和平精英', icon: 'brand:hepingjy', color: '#3E5C6E', order: 202 },
      { name: '原神', icon: 'brand:yuanshen', color: '#E9BC5F', order: 203 },
      { name: 'Steam', icon: 'brand:steam', color: '#1B2838', order: 204 },
      { name: '其他', icon: '⋯', color: '#6B7280', order: 205 }
    ]},
    { name: '影视', icon: '🎬', color: '#8B5CF6', order: 200, children: [
      { name: '腾讯视频', icon: 'brand:tencentvid', color: '#FF6022', order: 301 },
      { name: 'B站', icon: 'brand:bilibili', color: '#00A1D6', order: 302 },
      { name: '爱奇艺', icon: 'brand:iqiyi', color: '#00BE06', order: 303 },
      { name: '影院', icon: '🎟️', color: '#F59E0B', order: 304 },
      { name: '其他', icon: '⋯', color: '#6B7280', order: 305 }
    ]},
    { name: '音乐', icon: '🎵', color: '#06B6D4', order: 300, children: [
      { name: 'Apple Music', icon: 'brand:applemusic', color: '#FA243C', order: 401 },
      { name: '网易云音乐', icon: 'brand:neteasemus', color: '#C20C0C', order: 402 },
      { name: 'QQ音乐', icon: 'brand:qqmusic', color: '#31C27C', order: 403 },
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
      { name: '百度网盘', icon: 'brand:baiduyun', color: '#06A7FF', order: 501 },
      { name: '阿里网盘', icon: 'brand:aliyunpan', color: '#FF6A00', order: 502 },
      { name: '天翼网盘', icon: 'brand:tianyipan', color: '#EA1113', order: 503 },
      { name: '夸克网盘', icon: 'brand:quarkpan', color: '#4A90FF', order: 504 },
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
    { name: '微信读书订阅', icon: 'brand:weread', color: '#24A5FF', order: 105 },
    { name: '其他', icon: '⋯', color: '#6B7280', order: 106 }
  ]},
  { name: '其他', icon: '⋯', color: '#6B7280', order: 7 }
]

export const incomeTree: SeedNode[] = [
  { name: '工资', icon: '💰', color: '#10B981', order: 0 },
  { name: '投资', icon: '📈', color: '#3B82F6', order: 1, children: [
    { name: '余额宝收益', icon: 'brand:alipay', color: '#1677FF', order: 100 },
    { name: '零钱通收益', icon: 'brand:wechat', color: '#07C160', order: 101 },
    { name: '理财收益', icon: '📈', color: '#10B981', order: 102 },
    { name: '其他', icon: '⋯', color: '#6B7280', order: 103 }
  ]},
  { name: '兼职', icon: '💼', color: '#8B5CF6', order: 2 },
  { name: '退款', icon: '↩️', color: '#10B981', order: 3 },
  { name: '报销', icon: '🧾', color: '#3B82F6', order: 4, children: [
    { name: '公司报销', icon: '🏢', color: '#3B82F6', order: 100 },
    { name: '学校报销', icon: '🎓', color: '#3B82F6', order: 101 },
    { name: '其他报销', icon: '🧾', color: '#3B82F6', order: 102 }
  ]},
  { name: '他人转入', icon: '🤝', color: '#8B5CF6', order: 5 },
  { name: '二手卖出', icon: '📦', color: '#F59E0B', order: 6, children: [
    { name: '闲鱼', icon: 'brand:xianyu', color: '#FFE600', order: 100 },
    { name: '爱回收', icon: 'brand:aihuishou', color: '#FFD100', order: 101 },
    { name: '转转', icon: 'brand:zhuanzhuan', color: '#FF4B41', order: 102 },
    { name: '线下回收', icon: '🏪', color: '#F59E0B', order: 103 },
    { name: '熟人交易', icon: '🤝', color: '#F59E0B', order: 104 },
    { name: '其他平台', icon: '📦', color: '#F59E0B', order: 105 }
  ]},
  { name: '礼金红包', icon: '🧧', color: '#EF4444', order: 7, children: [
    { name: '节日红包', icon: '🧧', color: '#EF4444', order: 100 },
    { name: '生日红包', icon: '🎂', color: '#EF4444', order: 101 },
    { name: '礼金', icon: '🎁', color: '#EF4444', order: 102 },
    { name: '其他', icon: '⋯', color: '#EF4444', order: 103 }
  ]},
  { name: '奖励返现', icon: '🎉', color: '#10B981', order: 8, children: [
    { name: '活动奖励', icon: '🎉', color: '#10B981', order: 100 },
    { name: '消费返现', icon: '💰', color: '#10B981', order: 101 },
    { name: '其他', icon: '⋯', color: '#10B981', order: 102 }
  ]},
  { name: '其他收入', icon: '⋯', color: '#6B7280', order: 9 }
]

const defaultAccounts: Array<{ type: AccountType; order: number }> = [
  { type: 'alipay', order: 0 },
  { type: 'wechat', order: 1 },
  { type: 'unionpay', order: 2 },
  { type: 'fixed', order: 3 }
]

const SEED_FLAG_KEY = 'finflow.web.seeded.v1'
const INVESTMENT_CHILDREN_KEY = 'finflow.web.investment.children.v1'

const investmentChildren: SeedNode[] = [
  { name: '余额宝收益', icon: 'brand:alipay', color: '#1677FF', order: 100 },
  { name: '零钱通收益', icon: 'brand:wechat', color: '#07C160', order: 101 },
  { name: '理财收益', icon: '📈', color: '#10B981', order: 102 },
  { name: '其他', icon: '⋯', color: '#6B7280', order: 103 }
]

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
  if (localStorage.getItem(SEED_FLAG_KEY)) {
    await migrateInvestmentChildren()
    return
  }

  const existingCats = await db.categories.count()
  if (existingCats > 0) {
    localStorage.setItem(SEED_FLAG_KEY, '1')
    await migrateInvestmentChildren()
    return
  }

  const categories: Category[] = []
  insertTree(expenseTree, undefined, 'expense', categories)
  insertTree(incomeTree, undefined, 'income', categories)

  const accounts: Account[] = defaultAccounts.map(({ type, order }) => ({
    id: uid(),
    name: accountTypeLabel[type],
    type,
    icon: accountTypeIcon[type],
    colorHex: accountTypeColor[type],
    initialBalance: 0,
    sortOrder: order,
    isSystem: true,
    createdAt: new Date().toISOString()
  }))

  await db.categories.bulkAdd(categories)
  await db.accounts.bulkAdd(accounts)

  localStorage.setItem(SEED_FLAG_KEY, '1')
  localStorage.setItem(INVESTMENT_CHILDREN_KEY, '1')
}

async function migrateInvestmentChildren(): Promise<void> {
  if (localStorage.getItem(INVESTMENT_CHILDREN_KEY)) return

  const invest = await db.categories.where('name').equals('投资').first()
  if (!invest) {
    localStorage.setItem(INVESTMENT_CHILDREN_KEY, '1')
    return
  }

  const existing = await db.categories.where('parentId').equals(invest.id).first()
  if (existing) {
    localStorage.setItem(INVESTMENT_CHILDREN_KEY, '1')
    return
  }

  const toAdd: Category[] = investmentChildren.map(node => ({
    id: uid(),
    name: node.name,
    type: 'income',
    icon: node.icon,
    colorHex: node.color,
    sortOrder: node.order,
    isSystem: true,
    parentId: invest.id
  }))
  await db.categories.bulkAdd(toAdd)
  localStorage.setItem(INVESTMENT_CHILDREN_KEY, '1')
}
