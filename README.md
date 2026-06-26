# FinFlow

一款本地优先的个人记账应用，深色仪表盘风格，支持父子分类层级、预算管理、周期账单、CSV 导入导出。数据全部存储在设备本地（SwiftData），不上云、不联网。

## 功能

- **首页仪表盘**：月/年收支概览，日收支趋势柱状图，分类占比饼图（支持父子分类下钻），最近记录
- **账单**：按周期、分类、账户、关键词筛选；按日分组；底部结余栏
- **资产**：多账户管理（支付宝/微信/银行卡/定期），账户余额与交易流水
- **预算**：按分类设月度预算，超支预警横幅
- **周期账单**：自动生成周期性交易（月/周/年）
- **分类管理**：父子层级任意深度，拖动排序，系统分类预置
- **设置**：外观（跟随系统/深色/浅色）、CSV 导入导出、填充测试数据

## 技术栈

- SwiftUI + SwiftData
- Swift Charts
- iOS 26.5+ / macOS 26.5+
- 部署目标：iPhone、iPad、Vision Pro
- 无第三方依赖

## 项目结构

```
FinFlow/
├── FinFlowApp.swift          # @main 入口，外观与全局配置
├── Models/                   # SwiftData 模型
│   ├── Transaction.swift
│   ├── Category.swift
│   ├── Account.swift
│   ├── Budget.swift
│   └── RecurringTransaction.swift
├── Services/                 # 业务逻辑
│   ├── SeedDataService.swift     # 首次启动预置分类与账户
│   ├── SampleDataService.swift   # 测试数据生成
│   ├── CSVService.swift          # CSV 导入导出
│   ├── RecurringTransactionService.swift
│   ├── TransactionFilter.swift
│   └── TransactionFilterCriteria.swift
├── Extensions/               # Color/Date/Decimal/Account 扩展
└── Views/
    ├── MainTabView.swift
    ├── Home/                 # 首页仪表盘
    ├── Statistics/           # 图表（DailyBarChart、CategoryAnalysisView）
    ├── Transactions/         # 账单与表单
    ├── Categories/           # 分类管理
    ├── Accounts/             # 资产
    ├── Budget/               # 预算
    ├── Recurring/            # 周期账单
    ├── Components/           # 通用组件
    └── Settings/             # 设置
```

## 开发

```bash
# 用 Xcode 打开
open FinFlow.xcodeproj

# 命令行构建
xcodebuild -project FinFlow.xcodeproj -scheme FinFlow build

# 跑测试
xcodebuild -project FinFlow.xcodeproj -scheme FinFlow test

# 单个测试套件
xcodebuild -project FinFlow.xcodeproj -scheme FinFlow \
  -only-testing:FinFlowTests/SeedDataServiceTests test
```

## 装到 iPhone

1. 数据线连接 iPhone 到 Mac，Xcode 顶部设备选择器选 iPhone
2. 项目设置 → Signing & Capabilities → Team 选你的 Apple ID（免费 Personal Team 即可），必要时改 Bundle ID 为唯一值
3. `Cmd+R` 构建运行
4. iPhone 设置 → 通用 → VPN与设备管理 → 信任开发者描述文件

免费账号签名 7 天失效，需重新连接 Xcode 重新构建。长期使用建议付费 Apple Developer Program。

## 数据说明

- 全部数据存在设备本地 SwiftData 沙盒，卸载即清除
- 首次启动自动预置 74 个系统分类（支出 70 / 收入 4）与 4 个默认账户
- 「设置 → 开发 → 填充测试数据」可生成最近 24 个月的随机交易用于演示
- 「清空所有交易」后再「填充测试数据」可重置演示数据

## License

个人自用项目，未开源。
