# FinFlow

本地优先的个人记账应用。深色仪表盘风格，父子分类层级、预算管理、周期账单、CSV 导入导出。数据全部存本地，不上云、不联网。

## 双端实现

同一套产品逻辑，两套独立实现：

| 端 | 位置 | 技术栈 | 状态 |
|---|---|---|---|
| iOS / iPadOS / visionOS | [`ios/`](./ios) | SwiftUI + SwiftData + Swift Charts | 已完成 |
| Web (PWA) | [`web/`](./web) | React + Vite + TypeScript + Dexie + ECharts | 进行中 |

两端数据互不相通（iOS 用 SwiftData，PWA 用 IndexedDB），但数据模型、分类种子、业务逻辑保持对齐。

## 功能

- 月/年收支概览，日趋势柱状图
- 分类占比图，支持父子分类下钻
- 账单管理与多维度筛选
- 多账户资产管理
- 分类预算与超支预警
- 周期账单自动生成
- 父子分类层级管理（任意深度，拖动排序）
- CSV 导入导出
- 外观偏好（跟随系统/深色/浅色）

## PWA 端开发

```bash
cd web

# 安装依赖
npm install

# 开发服务器（http://localhost:5075）
npm run dev

# 生产构建（输出 dist/）
npm run build

# 预览生产构建
npm run preview

# 类型检查
npm run typecheck

# 单元测试（Vitest）
npm test
```

### PWA 安装

- **桌面 Chrome/Edge**：访问应用 → 地址栏右侧安装图标 → 安装
- **Android Chrome**：菜单 → 添加到主屏幕
- **iOS Safari**：分享 → 添加到主屏幕（iOS 限制：无后台推送、存储可能被清理）

Service Worker 自动注册，离线可访问。`vite-plugin-pwa` 在构建时生成 `manifest.webmanifest` 和 `sw.js`。

### 图标生成

```bash
cd web
python3 scripts/generate_pwa_icons.py
```

需要 Pillow (`pip install pillow`)。生成 192/512/maskable PNG 到 `web/public/icons/`。

### 项目结构

```
FinFlow/
├── ios/                     # SwiftUI 原生实现
│   ├── FinFlow/
│   ├── FinFlow.xcodeproj/
│   └── FinFlowTests/
├── web/                     # PWA React 实现
│   ├── src/
│   │   ├── db/              # Dexie 数据库、模型、种子数据
│   │   ├── layouts/         # 主布局（底部 Tab）
│   │   ├── pages/           # 首页/账单/资产/设置
│   │   ├── styles/          # 全局样式与设计 token
│   │   ├── App.tsx          # 路由
│   │   └── main.tsx         # 入口
│   ├── public/              # 静态资源（图标、manifest）
│   ├── scripts/             # 工具脚本
│   ├── index.html
│   ├── vite.config.ts       # Vite + PWA 配置
│   ├── tsconfig.json
│   └── package.json
```

## iOS 端开发

```bash
cd ios
open FinFlow.xcodeproj

# 命令行构建
xcodebuild -project FinFlow.xcodeproj -scheme FinFlow build

# 跑测试
xcodebuild -project FinFlow.xcodeproj -scheme FinFlow test
```

详见 [`ios/CLAUDE.md`](./ios/CLAUDE.md)。

## 设计

两端共享设计 token：

| Token | 深色 | 浅色 |
|---|---|---|
| 背景 | `#0F0F11` | `#F5F5F7` |
| 卡片 | `#1A1A1E` | `#FFFFFF` |
| 收入 | `#34D399` | `#34D399` |
| 支出 | `#F59E0B` | `#F59E0B` |
| 强调 | `#5B8DEF` | `#5B8DEF` |
| 超支 | `#EF4444` | `#EF4444` |

字体：SF Pro / PingFang SC，大数字用 `tabular-nums`。

## License

个人自用项目，未开源。
