# 账户编辑框改为展示/编辑「当前余额」— 设计文档

日期：2026-08-05
范围：FinFlow/web（前端），依赖 AppPilot/server 已写好的账户局部更新修复一起部署。

## 背景与动机

现状：账户的余额字段存的是「初始余额」（开户时余额），资产页显示的是「当前余额」= 初始余额 + 交易净额。用户在编辑框看到的是初始余额（如 24516.40），而列表显示当前余额（如 26554.32），两者不一致造成困惑。

目标：让账户编辑框直接**展示并编辑「当前余额」**。用户输入的就是账户实际余额，系统在后台反算初始余额，账单流水不受影响。

保存语义（已确认）：**静默反算初始余额**，不生成任何调整交易。

## 核心公式（叶子/容器通用）

编辑余额时只有「账户自身贡献」（即 initialBalance）在变，自身交易净额与子账户余额都不变，因此：

```
新 initialBalance = 旧 initialBalance + (输入的当前余额 − 旧的当前余额)
```

其中「旧的当前余额」必须与资产页那一行显示的余额取**同一个值**，delta 才恒等对齐。保存时前端只发 `{ initialBalance: 新值 }`。

## 统一余额模型（让容器可编辑且自洽）

定义：任意账户「当前余额」= `自身(initialBalance + 自身交易净额)` + `所有子账户当前余额之和`。

- 叶子账户：= 自身。与现状完全一致。
- 容器账户：现在显示 `Σ子账户`，改为 `自身 + Σ子账户`。

安全性：线上全部容器自身 `initialBalance = 0` 且无自身直接交易（已核实 id 9/15/53/58），故显示数值改动后不变；从此容器的编辑能落到自身 initialBalance 上并在资产页可见。

## 需要改动的点

### A. 反算 + 编辑框语义

**实际编辑入口勘误**：AccountsPage 的主 `AccountDialog` 只被 `mode:'new'`/`'initial'` 触发，其 `isEdit` 分支为不可达死代码——编辑现有账户实际只走 AccountDetailPage 详情页的「编辑」按钮 → `EditAccountDialog`。因此真正要改的编辑入口只有一个。

1. **AccountDetailPage `EditAccountDialog`（唯一编辑入口，本次核心改动）**
   - 标签「初始余额」→「余额」（当前余额）。
   - 打开时字段值 = 详情页已算好的账户当前余额 `balance`。
   - 保存时：`newInitial = reverseInitialBalance(account.initialBalance, 旧当前余额, 输入)`，发 `{ name, icon, colorHex, initialBalance: newInitial }`。

2. **AccountsPage 主 `AccountDialog`（仅新建）— 不改语义**
   - 新建账户无历史，当前余额 == 初始余额，输入即 initialBalance。标签保持「初始余额」。

3. **AccountsPage `InitialBalanceDialog`（「期初余额」按钮）— 保留不变**
   - 明确定位为「设置开户初始余额」的高级入口，仍直接编辑 `initialBalance`，标签保持「期初余额」。

### B. 显示逻辑统一（容器 `Σ子` → `自身 + Σ子`）

- `AccountsPage` `AccountRowGroup.mainBalance`：容器分支 `Σ子` → `own + Σ子`。
- `AccountsPage` 总资产 `leafSum`：改为「所有账户自身余额之和」（与 SettingsPage 一致，容器 own=0 时等价）。
- `SettingsPage` 账户行余额（约 238–243 行）：容器分支 `Σ子` → `own + Σ子`。
- `SettingsPage` 总资产（约 48 行）已是 sum-all-own，无需改。
- `AccountsPage` `netWorthHistory` 基线用叶子 initialBalance，容器 own=0 时保持一致，无需改。

### C. 数据来源

- **编辑反算**：AccountDetailPage 已计算并展示该账户当前余额 `balance`，直接把 `balance` 与 `account.initialBalance` 传入 `EditAccountDialog`。
- **容器显示**：AccountsPage 已有全局 `balances` map（每账户自身余额 own = initial + 自身交易）；SettingsPage 同样有。容器显示值 = `own + Σ子` 用已有 map 即可算出。

## 边界情况

- **容器编辑后子账户又发生交易**：容器显示 = own + Σ子 随子账户变动，own（反算值）固定。符合「容器总额随子账户浮动」预期。
- **新建账户**：无历史，输入即 initialBalance。
- **输入非法/空**：沿用现有 `parseFloat || 0` 兜底。
- **精度**：金额用现有 decimal/两位小数约定，delta 反算不引入新精度问题（加减法）。

## 部署依赖（已确认捆绑）

编辑框保存发部分字段（`{initialBalance}` / `{name,icon,colorHex,initialBalance}`）。必须与 **AppPilot/server 账户局部更新修复**（已写好、未部署）一起构建部署，否则线上旧后端整行覆盖会清空其它字段。

## 测试

- `utils` 层新增/复用纯函数：给定 account + balances 计算「显示余额」；给定输入 + 旧显示余额 + 旧 initialBalance 反算新 initialBalance。对叶子/容器分别加 vitest 用例。
- 提交前过 `typecheck` + `test` + `build`（FinFlow/web 约定）。

## 非目标（YAGNI）

- 不生成「余额调整」交易。
- 不改「期初余额」按钮语义。
- 不做容器余额向子账户摊派。
- 不改后端数据模型（沿用 initialBalance 字段）。
