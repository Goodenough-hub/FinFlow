# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 语言

所有对话内容必须使用中文输出。用户文档用中文，类名、配置键、CLI 参数保持英文。

## 项目概述

FinFlow 是个人记账应用，双端实现，按平台分目录：

- **iOS / iPadOS / visionOS**：`ios/` 目录下，SwiftUI + SwiftData + Swift Charts，已完成
- **Web PWA**：`web/` 目录下，React + Vite + TypeScript + Dexie + ECharts，进行中

根目录只放跨端共享文档（`README.md`、`CLAUDE.md`、`.gitignore`）。两端独立实现、独立数据存储，但数据模型、分类种子、业务逻辑对齐。改一端的功能时，考虑另一端是否需要同步。

## PWA 端

位于 `web/` 目录。技术栈：Vite + React 18 + TypeScript + Dexie（IndexedDB）+ ECharts + react-router-dom + vite-plugin-pwa。

```bash
cd web

# 开发（http://localhost:5075）
npm run dev

# 构建（输出 dist/）
npm run build

# 类型检查
npm run typecheck

# 重新生成 PWA 图标（需要 Pillow）
python3 scripts/generate_pwa_icons.py
```

### 关键路径

- `web/src/db/models.ts` — TypeScript 类型定义（对照 Swift 模型）
- `web/src/db/db.ts` — Dexie 数据库 schema 与索引
- `web/src/db/seed.ts` — 74 个预置分类 + 4 个默认账户的种子数据
- `web/src/layouts/MainLayout.tsx` — 底部 Tab 主布局
- `web/src/pages/` — 首页 / 账单 / 资产 / 设置 四个 Tab 页面
- `web/vite.config.ts` — PWA manifest、Service Worker 缓存策略

### 设计 token

CSS 变量定义在 `web/src/styles/global.css`，对照 iOS 端 `Color+Extensions.swift`。深色优先，浅色通过 `prefers-color-scheme` 自适应。

### 数据迁移

`web/src/db/seed.ts` 用 `localStorage['finflow.web.seeded.v1']` 标记是否已 seed。Dexie schema 升级时在 `db.ts` 用 `version(n).stores(...)` 链式增加。

## iOS 端

详见 `ios/CLAUDE.md` 与 `ios/FinFlow/` 代码。SwiftUI + SwiftData，74 个系统分类 + 4 个默认账户，深色仪表盘风格。

```bash
cd ios
xcodebuild -project FinFlow.xcodeproj -scheme FinFlow build
xcodebuild -project FinFlow.xcodeproj -scheme FinFlow test
```

## 测试约定

每次新增/删除/重构功能必须同步更新对应端的单元测试：

- PWA：暂未引入测试框架（待加 Vitest）
- iOS：`ios/FinFlowTests/` 下按功能分文件，Swift Testing 框架

## 跨端一致性

修改以下任一处时，必须检查另一端是否需要同步：

- 数据模型字段（`web/src/db/models.ts` ↔ `ios/FinFlow/Models/`）
- 种子分类树（`web/src/db/seed.ts` ↔ `ios/FinFlow/Services/SeedDataService.swift`）
- 设计 token（`web/src/styles/global.css` ↔ `ios/FinFlow/Extensions/Color+Extensions.swift`）
- 业务逻辑（金额计算、分类汇总、过滤条件等）
