# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 语言

所有对话内容必须使用中文输出。用户文档用中文，类名、配置键、CLI 参数保持英文。

## 项目概述

FinFlow 是一个全新的 SwiftUI 应用，目前仅包含 Xcode 默认模板代码（`FinFlowApp.swift` + `ContentView.swift`）。尚无业务逻辑、模型层或网络层，新增功能时需从零搭建架构。

## 平台与构建配置

- 多平台目标：iOS / macOS / visionOS（`SDKROOT = auto`，`SUPPORTED_PLATFORMS` 包含 iphoneos/iphonesimulator/macosx/xros/xrsimulator）
- 部署目标：iOS 26.5、macOS 26.5
- Swift 5.0
- Bundle ID：`com.ming.FinFlow`
- 设备族：iPhone、iPad、Vision Pro（`TARGETED_DEVICE_FAMILY = 1,2,7`）

## 常用命令

```bash
# 构建（默认多平台，自动选择 SDK）
xcodebuild -project FinFlow.xcodeproj -scheme FinFlow build

# 指定平台构建
xcodebuild -project FinFlow.xcodeproj -scheme FinFlow -destination 'platform=iOS Simulator,name=iPhone 15' build
xcodebuild -project FinFlow.xcodeproj -scheme FinFlow -destination 'platform=macOS' build

# 运行测试
xcodebuild -project FinFlow.xcodeproj -scheme FinFlow test

# 单个测试
xcodebuild -project FinFlow.xcodeproj -scheme FinFlow -only-testing:FinFlowTests/SomeTestClass/testMethod test
```

日常开发推荐直接用 Xcode GUI（`open FinFlow.xcodeproj`），命令行构建主要用于 CI/脚本。

## 代码结构

```
FinFlow/
├── FinFlowApp.swift     # @main 入口，声明 WindowGroup → ContentView
├── ContentView.swift    # 默认占位视图
└── Assets.xcassets/      # 资源目录（AppIcon、AccentColor）
```

项目无包管理器依赖（无 `Package.swift` 或 `Podfile`），未来如需引入依赖首选 Swift Package Manager（在 Xcode 中 File → Add Package Dependencies）。
