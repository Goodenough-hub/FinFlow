// 分类品牌图标注册表。key 为品牌 slug，与 categories.icon 字段中 `brand:<slug>`
// 的 slug 一一对应。
//
// 渲染优先级：logo (多色 PNG/ICO 直出) > svg (currentColor 线稿走 mask 上色) > mono (字母兜底)。
// 品牌 favicon / apple-touch-icon 来自各平台公开图标端点，属于识别用途的名义使用。
// pinduoduo.svg 来自 Arcticons (CC-BY-SA 4.0)，见 public/icons/categories/CREDITS.md。

export interface BrandDef {
  /** 展示名（仅调试用途） */
  name: string
  /** 品牌主色：logo 变体用于容器边框 tint，svg 变体用于 mask 填色，mono 变体用于底色 */
  color: string
  /** 多色 logo 文件名（含扩展名，如 jd.ico），存在则直接 <img> 渲染 */
  logo?: string
  /** currentColor 单色 SVG 文件名（不含扩展名），mask 填色为 color */
  svg?: string
  /** logo/svg 均缺失时的中文/字母 monogram，1-2 字符最佳 */
  mono?: string
}

export const CATEGORY_BRANDS: Record<string, BrandDef> = {
  // 电商
  jd:         { name: '京东',       color: '#E1251B', logo: 'jd.ico' },
  taobao:     { name: '淘宝',       color: '#FF6900', logo: 'taobao.ico' },
  pinduoduo:  { name: '拼多多',     color: '#E02E24', svg: 'pinduoduo' },
  douyin:     { name: '抖音',       color: '#000000', logo: 'douyin.ico' },

  // 游戏
  wangzhe:    { name: '王者荣耀',   color: '#B99154', logo: 'wangzhe.ico' },
  hepingjy:   { name: '和平精英',   color: '#3E5C6E', logo: 'hepingjy.ico' },
  yuanshen:   { name: '原神',       color: '#E9BC5F', logo: 'yuanshen.ico' },
  steam:      { name: 'Steam',      color: '#1B2838', logo: 'steam.png' },

  // 影视
  tencentvid: { name: '腾讯视频',   color: '#FF6022', logo: 'tencentvid.png' },
  bilibili:   { name: 'B站',        color: '#00A1D6', logo: 'bilibili.ico' },
  iqiyi:      { name: '爱奇艺',     color: '#00BE06', logo: 'iqiyi.png' },

  // 音乐
  applemusic: { name: 'Apple Music', color: '#FA243C', logo: 'applemusic.png' },
  neteasemus: { name: '网易云音乐',  color: '#C20C0C', logo: 'neteasemus.ico' },
  qqmusic:    { name: 'QQ音乐',      color: '#31C27C', logo: 'qqmusic.ico' },

  // 网盘
  baiduyun:   { name: '百度网盘',    color: '#06A7FF', logo: 'baiduyun.ico' },
  aliyunpan:  { name: '阿里云盘',    color: '#FF6A00', logo: 'aliyunpan.ico' },
  tianyipan:  { name: '天翼云盘',    color: '#EA1113', logo: 'tianyipan.ico' },
  quarkpan:   { name: '夸克网盘',    color: '#4A90FF', logo: 'quarkpan.ico' },
}

// 分类中文名 → 品牌 slug 反向映射。用于 seed 迁移和 UI 层根据 category.name 智能识别。
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
