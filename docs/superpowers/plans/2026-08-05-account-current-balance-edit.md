# 账户编辑框改为编辑「当前余额」实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让账户详情页编辑框展示并编辑「当前余额」，系统静默反算 initialBalance；同时统一容器账户余额显示为「自身 + Σ子账户」，使容器也可编辑且自洽。

**Architecture:** 新增两个纯函数（`accountDisplayBalance`、`reverseInitialBalance`）到 `utils/account.ts` 作为可测核心；容器显示三处从 `Σ子` 改为 `own + Σ子`；AccountDetailPage 详情余额统一为 `own + Σ子`，其 `EditAccountDialog` 用当前余额显示、保存时反算。全部前端改动，随已写好的后端账户局部更新修复一起部署。

**Tech Stack:** React + Vite + TypeScript，测试用 vitest。

## Global Constraints

- 语言：所有面向用户文案用中文。
- 提交前 FinFlow/web 必过 `npm run typecheck` + `npm test` + `npm run build`。
- 提交信息中文，前缀 `feat(pwa):` / `fix(pwa):`；Git 身份须为 `Goodenough <2323342501@qq.com>`——本计划各步的 `git commit` 由用户或执行者按此身份提交。
- 金额沿用现有 `number` + 两位小数约定，反算只用加减法，不引入新精度处理。
- 容器（有子账户的根账户）线上自身 `initialBalance` 均为 0；显示逻辑改为 `own + Σ子` 后数值不变。
- 后端 `updateAccount` 已改为局部更新（只更新请求下发字段），本功能保存发部分字段依赖它一起部署。

---

### Task 1: 新增纯函数 `reverseInitialBalance` 与 `accountDisplayBalance`

**Files:**
- Modify: `FinFlow/web/src/utils/account.ts`
- Test: `FinFlow/web/src/utils/account.test.ts`

**Interfaces:**
- Consumes: 现有 `Account` 类型、`getChildrenMap`（同文件）。
- Produces:
  - `reverseInitialBalance(oldInitialBalance: number, oldDisplayBalance: number, newDisplayBalance: number): number` — 返回 `oldInitialBalance + (newDisplayBalance - oldDisplayBalance)`。
  - `accountDisplayBalance(accountId: string, childrenMap: Map<string, Account[]>, ownBalances: Map<string, number>): number` — 返回 `own + Σ子own`，其中 `own = ownBalances.get(accountId) ?? 0`，子账户取 `childrenMap.get(accountId)` 各自 `ownBalances`。叶子账户（无子）返回 own。

- [ ] **Step 1: 写失败测试**

在 `FinFlow/web/src/utils/account.test.ts` 末尾追加（文件已有 `makeAccount` 辅助与 vitest 导入）：

```ts
import { reverseInitialBalance, accountDisplayBalance } from './account'

describe('reverseInitialBalance', () => {
  it('叶子：当前余额从 26554.32 改为 30000，初始余额按 delta 反算', () => {
    // 旧初始 24516.40，旧当前 26554.32；改当前到 30000
    const result = reverseInitialBalance(24516.4, 26554.32, 30000)
    expect(result).toBeCloseTo(24516.4 + (30000 - 26554.32), 2)
  })

  it('当前余额不变时，初始余额不变', () => {
    expect(reverseInitialBalance(100, 250, 250)).toBe(100)
  })

  it('调小当前余额，初始余额同额减少', () => {
    expect(reverseInitialBalance(100, 250, 200)).toBe(50)
  })
})

describe('accountDisplayBalance', () => {
  it('叶子账户返回自身余额', () => {
    const own = new Map([['a', 123.45]])
    expect(accountDisplayBalance('a', new Map(), own)).toBeCloseTo(123.45, 2)
  })

  it('容器账户返回 自身 + Σ子账户', () => {
    const parent = makeAccount('p')
    const c1 = makeAccount('c1', { parentId: 'p' })
    const c2 = makeAccount('c2', { parentId: 'p' })
    const childrenMap = getChildrenMap([parent, c1, c2])
    const own = new Map([['p', 10], ['c1', 100], ['c2', 200]])
    expect(accountDisplayBalance('p', childrenMap, own)).toBe(310)
  })

  it('容器自身余额为 0 时等于 Σ子账户', () => {
    const parent = makeAccount('p')
    const c1 = makeAccount('c1', { parentId: 'p' })
    const childrenMap = getChildrenMap([parent, c1])
    const own = new Map([['p', 0], ['c1', 500]])
    expect(accountDisplayBalance('p', childrenMap, own)).toBe(500)
  })

  it('缺失余额按 0 处理', () => {
    expect(accountDisplayBalance('missing', new Map(), new Map())).toBe(0)
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd FinFlow/web && npx vitest run src/utils/account.test.ts`
Expected: FAIL —— `reverseInitialBalance is not a function` / `accountDisplayBalance is not a function`（或导入报错）。

- [ ] **Step 3: 实现两个纯函数**

在 `FinFlow/web/src/utils/account.ts` 末尾追加：

```ts
export function reverseInitialBalance(
  oldInitialBalance: number,
  oldDisplayBalance: number,
  newDisplayBalance: number
): number {
  return oldInitialBalance + (newDisplayBalance - oldDisplayBalance)
}

export function accountDisplayBalance(
  accountId: string,
  childrenMap: Map<string, Account[]>,
  ownBalances: Map<string, number>
): number {
  const own = ownBalances.get(accountId) ?? 0
  const kids = childrenMap.get(accountId) ?? []
  return own + kids.reduce((s, k) => s + (ownBalances.get(k.id) ?? 0), 0)
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `cd FinFlow/web && npx vitest run src/utils/account.test.ts`
Expected: PASS（全部用例通过）。

- [ ] **Step 5: typecheck**

Run: `cd FinFlow/web && npm run typecheck`
Expected: 无输出、退出码 0。

- [ ] **Step 6: 提交**

```bash
cd FinFlow/web
git add src/utils/account.ts src/utils/account.test.ts
git commit -m "feat(pwa): 新增账户余额反算与容器显示余额纯函数"
```

---

### Task 2: AccountsPage 容器余额显示与总资产改为「自身 + Σ子」

**Files:**
- Modify: `FinFlow/web/src/pages/AccountsPage.tsx`

**Interfaces:**
- Consumes: Task 1 的 `accountDisplayBalance`；现有 `balances` map（`AccountsPage` 内，line ~91，键=账户 id，值=own=initialBalance+自身交易）、`childrenMap`（line ~70）。
- Produces: 页面显示行为变化，无导出接口。

- [ ] **Step 1: 导入 `accountDisplayBalance`**

修改 `FinFlow/web/src/pages/AccountsPage.tsx` 顶部导入。当前文件未导入 `utils/account`，在其它 utils 导入附近（如 line 13-15 区域）新增：

```ts
import { accountDisplayBalance } from '../utils/account'
```

`AccountsPage` 已有本地 `childrenMap`（component 级 useMemo，line ~70-84），Step 3 的 `leafSum` 直接复用它，无需额外导入 `getChildrenMap`。

- [ ] **Step 2: 改容器行余额 `mainBalance`（`AccountRowGroup`）**

在 `AccountRowGroup` 内，把现有（约 line 444-447）：

```ts
  const hasChildren = children.length > 0
  // 主账户余额：叶子直接取余额；分组容器=子账户之和
  const mainBalance = hasChildren
    ? children.reduce((s, k) => s + (balances.get(k.id) ?? 0), 0)
    : (balances.get(account.id) ?? 0)
```

改为「自身 + Σ子账户」统一公式（叶子无子账户，退化为自身）：

```ts
  const hasChildren = children.length > 0
  // 余额 = 账户自身余额 + 所有子账户余额（叶子无子账户，即自身）
  const mainBalance = (balances.get(account.id) ?? 0)
    + children.reduce((s, k) => s + (balances.get(k.id) ?? 0), 0)
```

（`hasChildren` 仍被后续 className 使用，保留该行。）

- [ ] **Step 3: 改总资产 `leafSum` 为「所有账户自身余额之和」**

把 `useMemo` 里的 `leafSum`（约 line 119-124）：

```ts
    // 汇总只算叶子账户（无子账户的主账户 + 所有子账户）
    const leafSum = (roots: Account[]) => roots.reduce((s, a) => {
      const kids = childrenMap.get(a.id) ?? []
      if (kids.length === 0) return s + (balances.get(a.id) ?? 0)
      return s + kids.reduce((cs, k) => cs + (balances.get(k.id) ?? 0), 0)
    }, 0)
```

改为对每个根账户取 `own + Σ子`（用 Task 1 的 `accountDisplayBalance`，与行显示口径一致）：

```ts
    // 每个根账户 = 自身 + Σ子账户；容器自身余额计入总额
    const leafSum = (roots: Account[]) =>
      roots.reduce((s, a) => s + accountDisplayBalance(a.id, childrenMap, balances), 0)
```

- [ ] **Step 4: typecheck + build**

Run: `cd FinFlow/web && npm run typecheck && npm run build`
Expected: typecheck 无错误；build 成功产出 `dist/`。

- [ ] **Step 5: 提交**

```bash
cd FinFlow/web
git add src/pages/AccountsPage.tsx
git commit -m "feat(pwa): 资产页容器余额与总额统一为 自身+子账户"
```

---

### Task 3: SettingsPage 容器行余额改为「自身 + Σ子」

**Files:**
- Modify: `FinFlow/web/src/pages/SettingsPage.tsx`

**Interfaces:**
- Consumes: 现有 `balances` map（line ~30-46）、`childrenMap`（line ~28，来自 `getChildrenMap`）。
- Produces: 无导出接口。

- [ ] **Step 1: 改容器行余额**

`SettingsPage.tsx` 约 line 237-243 现有：

```ts
                  (childrenMap.get(a.id) ?? []).length > 0
                    ? (childrenMap.get(a.id) ?? []).reduce(
                        (s, k) => s + (balances.get(k.id) ?? 0),
                        0
                      )
                    : (balances.get(a.id) ?? 0)
```

改为「自身 + Σ子」统一公式：

```ts
                  (balances.get(a.id) ?? 0)
                    + (childrenMap.get(a.id) ?? []).reduce(
                        (s, k) => s + (balances.get(k.id) ?? 0),
                        0
                      )
```

（总资产 line ~48 已是 `accs.reduce((s,a)=>s+balances.get(a.id))`，即所有账户自身余额之和，无需改动。）

- [ ] **Step 2: typecheck**

Run: `cd FinFlow/web && npm run typecheck`
Expected: 无错误。

- [ ] **Step 3: 提交**

```bash
cd FinFlow/web
git add src/pages/SettingsPage.tsx
git commit -m "feat(pwa): 设置页容器余额显示统一为 自身+子账户"
```

---

### Task 4: AccountDetailPage 详情余额统一为「自身 + Σ子」

**Files:**
- Modify: `FinFlow/web/src/pages/AccountDetailPage.tsx`

**Interfaces:**
- Consumes: 现有 `account`、`allTransactions`、`id`、`isGroup`、`childAccounts`、`childBalances`。
- Produces: 新增 `ownBalance`（number，账户自身 initialBalance + 自身直接交易净额），供 Task 5 的 `EditAccountDialog` 反算基准与 `balance` 复用。`balance` 语义变为 `own + Σ子`（叶子即 own）。

- [ ] **Step 1: 新增 `ownBalance`、重写 `balance`**

把现有 `balance` useMemo（line 74-90）：

```ts
  const balance = useMemo(() => {
    if (!account) return 0
    if (isGroup) {
      return childAccounts.reduce((s, c) => s + (childBalances.get(c.id) ?? 0), 0)
    }
    let total = account.initialBalance
    for (const t of accountTransactions) {
      if (t.type === 'transfer') {
        if (t.accountId === id) total -= t.amount
        if (t.toAccountId === id) total += t.amount
      } else if (t.accountId === id) {
        if (t.type === 'income') total += t.amount
        else if (t.type === 'expense') total -= t.amount
      }
    }
    return total
  }, [account, isGroup, childAccounts, childBalances, accountTransactions, id])
```

替换为：先算账户自身余额 `ownBalance`（不含子账户），再算 `balance = own + Σ子`：

```ts
  // 账户自身余额：initialBalance + 直接挂在本账户上的交易净额（不含子账户）
  const ownBalance = useMemo(() => {
    if (!account) return 0
    let total = account.initialBalance
    for (const t of allTransactions) {
      if (t.type === 'transfer') {
        if (t.accountId === id) total -= t.amount
        if (t.toAccountId === id) total += t.amount
      } else if (t.accountId === id) {
        if (t.type === 'income') total += t.amount
        else if (t.type === 'expense') total -= t.amount
      }
    }
    return total
  }, [account, allTransactions, id])

  // 展示余额：自身 + 所有子账户余额（叶子无子账户，即自身）
  const balance = useMemo(() => {
    if (isGroup) {
      return ownBalance + childAccounts.reduce((s, c) => s + (childBalances.get(c.id) ?? 0), 0)
    }
    return ownBalance
  }, [isGroup, ownBalance, childAccounts, childBalances])
```

说明：叶子账户 `balance === ownBalance`，与旧逻辑等价；容器 `balance = own + Σ子`，因容器 own=0 数值不变。

- [ ] **Step 2: typecheck**

Run: `cd FinFlow/web && npm run typecheck`
Expected: 无错误（注意不要留下未使用变量；`accountTransactions` 仍被月度列表使用，保留）。

- [ ] **Step 3: build**

Run: `cd FinFlow/web && npm run build`
Expected: 成功。

- [ ] **Step 4: 提交**

```bash
cd FinFlow/web
git add src/pages/AccountDetailPage.tsx
git commit -m "feat(pwa): 账户详情余额统一为 自身+子账户，拆出 ownBalance"
```

---

### Task 5: `EditAccountDialog` 编辑「当前余额」并反算 initialBalance

**Files:**
- Modify: `FinFlow/web/src/pages/AccountDetailPage.tsx`

**Interfaces:**
- Consumes: Task 1 `reverseInitialBalance`；Task 4 的 `balance`（当前余额）、`account.initialBalance`。
- Produces: 无导出接口；`EditAccountDialog` 新增 prop `currentBalance: number`。

- [ ] **Step 1: 导入 `reverseInitialBalance`**

`AccountDetailPage.tsx` 顶部已 `import { getLeafAccounts } from '../utils/account'`（line 7）。改为：

```ts
import { getLeafAccounts, reverseInitialBalance } from '../utils/account'
```

- [ ] **Step 2: 给 `EditAccountDialog` 传 `currentBalance`**

找到渲染处（line 305）：

```tsx
        <EditAccountDialog account={account} onClose={() => setEditing(false)} />
```

改为把当前余额传入：

```tsx
        <EditAccountDialog account={account} currentBalance={balance} onClose={() => setEditing(false)} />
```

- [ ] **Step 3: 扩展 `EditProps` 与初始化字段值**

`EditProps` 接口（约 line 329-332）当前：

```ts
interface EditProps {
  account: Account
  onClose: () => void
}
```

改为新增 `currentBalance`：

```ts
interface EditProps {
  account: Account
  currentBalance: number
  onClose: () => void
}
```

组件签名与状态初始化（line 334、339）当前：

```ts
function EditAccountDialog({ account, onClose }: EditProps) {
  const navigate = useNavigate()
  const [name, setName] = useState(account.name)
  const [icon, setIcon] = useState(account.icon)
  const [colorHex, setColorHex] = useState(account.colorHex)
  const [initialBalance, setInitialBalance] = useState(String(account.initialBalance))
```

改为：字段状态名改为 `balanceInput`，初值取当前余额：

```ts
function EditAccountDialog({ account, currentBalance, onClose }: EditProps) {
  const navigate = useNavigate()
  const [name, setName] = useState(account.name)
  const [icon, setIcon] = useState(account.icon)
  const [colorHex, setColorHex] = useState(account.colorHex)
  const [balanceInput, setBalanceInput] = useState(String(currentBalance))
```

- [ ] **Step 4: 保存时反算 initialBalance**

`handleSave`（line 341-351）当前：

```ts
  const handleSave = async () => {
    if (!name.trim()) return
    await accountsApi.update(account.id, {
      name: name.trim(),
      icon,
      colorHex,
      initialBalance: parseFloat(initialBalance) || 0
    })
    await refreshAccounts()
    onClose()
  }
```

改为用 `reverseInitialBalance` 从输入的当前余额反算：

```ts
  const handleSave = async () => {
    if (!name.trim()) return
    const newDisplay = parseFloat(balanceInput) || 0
    const newInitial = reverseInitialBalance(account.initialBalance, currentBalance, newDisplay)
    await accountsApi.update(account.id, {
      name: name.trim(),
      icon,
      colorHex,
      initialBalance: newInitial
    })
    await refreshAccounts()
    onClose()
  }
```

- [ ] **Step 5: 改字段标签与绑定**

余额字段的 JSX（line 382-393）当前：

```tsx
          <div className="dialog-field">
            <label>初始余额</label>
            <div className="amount-input-wrap">
              <span className="amount-currency">¥</span>
              <input
                className="amount-input"
                type="text"
                inputMode="decimal"
                value={initialBalance}
                onChange={e => setInitialBalance(e.target.value)}
              />
            </div>
          </div>
```

改为标签「余额」并绑定 `balanceInput`：

```tsx
          <div className="dialog-field">
            <label>余额</label>
            <div className="amount-input-wrap">
              <span className="amount-currency">¥</span>
              <input
                className="amount-input"
                type="text"
                inputMode="decimal"
                value={balanceInput}
                onChange={e => setBalanceInput(e.target.value)}
              />
            </div>
          </div>
```

- [ ] **Step 6: typecheck + test + build**

Run: `cd FinFlow/web && npm run typecheck && npm test && npm run build`
Expected: typecheck 无错误；vitest 全绿；build 成功。

- [ ] **Step 7: 提交**

```bash
cd FinFlow/web
git add src/pages/AccountDetailPage.tsx
git commit -m "feat(pwa): 账户详情编辑框改为编辑当前余额并反算初始余额"
```

---

### Task 6: 手工验证（真机/浏览器）

**Files:** 无（验证任务）。

- [ ] **Step 1: 本地起后端（含已改的局部更新）+ 前端**

在 `AppPilot/server` 起后端（需 PG + 环境变量）：`go run . serve`
在 `FinFlow/web`：`npm run dev`（:5075，/api 代理到 :8080）。

- [ ] **Step 2: 叶子账户验证（云闪付 id=57 场景）**

打开一个有交易的叶子账户详情页 → 记下当前余额 X → 点「编辑」→ 余额字段应显示 X（不是初始余额）→ 改成 X+100 → 保存 → 详情页与资产页余额应显示 X+100，且账单流水条数不变。

- [ ] **Step 3: 反算正确性**

对上一步账户，编辑余额不改直接保存 → 余额不变（delta=0，initialBalance 不变）。

- [ ] **Step 4: 容器账户验证**

打开一个有子账户的容器（如支付宝）→ 编辑余额改为「子账户之和 + 50」→ 保存 → 资产页该容器行应显示「子账户之和 + 50」；随后给某子账户加一笔交易 → 容器显示随子账户浮动 + 保留 50 的自身部分。

- [ ] **Step 5: 回归检查**

资产页总资产、流动/定期分组合计数值正确；SettingsPage 账户列表数值与资产页一致；「期初余额」按钮仍按原「初始余额」语义工作。

---

## 部署（本计划外，用户已确认「捆绑一起部署」）

前端 build 产物 + 后端局部更新修复一起部署（步骤见 AGENTS.md §4/§5）。后端需 `make build` 交叉编译并替换 `/opt/apppilot/apppilot-server` 后重启 `apppilot.service`；前端 `dist/` 同步到 `/var/www/finflow`。部署前需 `scripts/generate_pwa_icons.py` 生成 PWA 图标。**部署动作在用户明确指示时再执行。**
