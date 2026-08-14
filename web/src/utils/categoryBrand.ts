// 分类品牌图标注册表。key 为品牌 slug，与 categories.icon 字段中 `brand:<slug>`
// 的 slug 一一对应。svg 存在时优先渲染 /icons/categories/<svg>.svg（受 CSS mask
// 控色为 color）；否则退化为 mono 单字块。品牌色来自各平台官方视觉规范。

export interface BrandDef {
  /** 展示名（仅调试用途，非渲染必需） */
  name: string
  /** 官方主色，用于容器 tint、mask 填充或 monogram 底色 */
  color: string
  /** 若存在则从 /icons/categories/<svg>.svg 加载单色 SVG（simple-icons 单色） */
  svg?: string
  /** SVG 缺失时的中文/字母 monogram，1-2 字符最佳 */
  mono?: string
}

export const CATEGORY_BRANDS: Record<string, BrandDef> = {
  // 电商
  jd:         { name: '京东',       color: '#E1251B', mono: '京' },
  taobao:     { name: '淘宝',       color: '#FF4200', svg: 'taobao' },
  pinduoduo:  { name: '拼多多',     color: '#E02E24', mono: '拼' },
  douyin:     { name: '抖音',       color: '#000000', svg: 'tiktok' },

  // 游戏
  wangzhe:    { name: '王者荣耀',   color: '#B99154', mono: '王' },
  hepingjy:   { name: '和平精英',   color: '#3E5C6E', mono: '和' },
  yuanshen:   { name: '原神',       color: '#E9BC5F', svg: 'mihoyo' },
  steam:      { name: 'Steam',      color: '#1B2838', svg: 'steam' },

  // 影视
  tencentvid: { name: '腾讯视频',   color: '#FF6022', mono: '腾' },
  bilibili:   { name: 'B站',        color: '#00A1D6', svg: 'bilibili' },
  iqiyi:      { name: '爱奇艺',     color: '#00BE06', mono: '爱' },

  // 音乐
  applemusic: { name: 'Apple Music', color: '#FA243C', svg: 'applemusic' },
  neteasemus: { name: '网易云音乐',  color: '#C20C0C', svg: 'neteasecloudmusic' },
  qqmusic:    { name: 'QQ音乐',      color: '#31C27C', mono: 'Q' },

  // 网盘
  baiduyun:   { name: '百度网盘',    color: '#06A7FF', svg: 'baidu' },
  aliyunpan:  { name: '阿里云盘',    color: '#FF6A00', mono: '阿' },
  tianyipan:  { name: '天翼云盘',    color: '#EA1113', mono: '翼' },
  quarkpan:   { name: '夸克网盘',    color: '#4A90FF', mono: '夸' },
}

// 分类中文名 → 品牌 slug 反向映射。用于 seed 迁移（老用户 icon 是 emoji 时按名匹配）
// 和 UI 层根据 category.name 智能识别（可选未来扩展）。
export const CATEGORY_NAME_TO_BRAND: Record<string, string> = {
  '京东': 'jd',
  '淘宝': 'taobao',
  '拼多多': 'pinduoduo',
  '抖音': 'douyin',
  '王者荣耀': 'wangzhe',
  '和平精英': 'hepingjy',
  '原神': 'yuanshen',
  'Steam': 'steam',
  '腾讯视频': 'tencentvid',
  'B站': 'bilibili',
  '爱奇艺': 'iqiyi',
  'Apple Music': 'applemusic',
  '网易云音乐': 'neteasemus',
  'QQ音乐': 'qqmusic',
  '百度网盘': 'baiduyun',
  '阿里网盘': 'aliyunpan',
  '天翼网盘': 'tianyipan',
  '夸克网盘': 'quarkpan',
}

/** 从 icon 字段（如 "brand:jd"）解析出 BrandDef；返回 null 表示不是品牌图标 */
export function parseBrand(icon: string): BrandDef | null {
  const m = /^brand:(.+)$/.exec(icon)
  if (!m) return null
  return CATEGORY_BRANDS[m[1]] ?? null
}
