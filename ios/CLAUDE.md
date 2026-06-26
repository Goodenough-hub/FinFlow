# CLAUDE.md (iOS)

FinFlow iOS 端：SwiftUI + SwiftData + Swift Charts，部署目标 iOS 26.5 / macOS 26.5。

## 平台与构建

- 多平台目标：iOS / macOS / visionOS（`SDKROOT = auto`）
- 部署目标：iOS 26.5、macOS 26.5
- Swift 5.0
- Bundle ID：`com.ming.FinFlow`
- 设备族：iPhone、iPad、Vision Pro（`TARGETED_DEVICE_FAMILY = 1,2,7`）

```bash
# 构建
xcodebuild -project FinFlow.xcodeproj -scheme FinFlow build

# 指定平台
xcodebuild -project FinFlow.xcodeproj -scheme FinFlow \
  -destination 'platform=iOS Simulator,name=iPhone 17' build

# 测试
xcodebuild -project FinFlow.xcodeproj -scheme FinFlow test

# 单个测试
xcodebuild -project FinFlow.xcodeproj -scheme FinFlow \
  -only-testing:FinFlowTests/SomeTestClass/testMethod test
```

日常开发用 Xcode GUI（`open FinFlow.xcodeproj`）。

## 代码结构

```
ios/
├── FinFlow/
│   ├── FinFlowApp.swift          # @main 入口
│   ├── Models/                   # SwiftData 模型
│   ├── Services/                 # 业务逻辑
│   ├── Extensions/               # Color/Date/Decimal 扩展
│   ├── Views/                    # 视图
│   └── Assets.xcassets/
├── FinFlow.xcodeproj/
├── FinFlowTests/                 # Swift Testing 单元测试
└── scripts/                      # AppIcon 生成脚本
```

无包管理器依赖。未来如需引入依赖首选 Swift Package Manager。

## 设计 token

`FinFlow/Extensions/Color+Extensions.swift` 定义全部颜色 token，与 PWA 端 `web/src/styles/global.css` 的 CSS 变量一一对应。`UIColor(dynamicProvider:)` 实现深浅色自适应。

## 测试约定

`FinFlowTests/` 下按功能分文件，使用 Swift Testing 框架（`@Test`、`#expect`）。每次新增/删除/重构功能必须同步更新测试。

## 装机

数据线连接 iPhone → Xcode 选设备 → Signing & Capabilities 选 Apple ID（Personal Team 即可）→ `Cmd+R`。iPhone 端首次需在「设置 → 通用 → VPN与设备管理」信任开发者描述文件。免费账号签名 7 天失效。
