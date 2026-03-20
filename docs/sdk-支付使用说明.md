# SDK 支付使用说明

本文说明本 SDK 中与 **链上支付 / 充值落库** 相关的能力、接入方式及与 User Center 的约定。实现代码与更细的改造背景见 [`payment-only-modification-plan-zh.md`](./payment-only-modification-plan-zh.md)。

---

## 1. 能力概览

SDK 提供两条并列路径，**互不影响**：

| 能力 | 典型场景 | UI | Hook | 链上 | 落库接口 | 权益发放与轮询 |
|------|----------|-----|------|------|----------|----------------|
| **Deposit（充值）** | 充值得积分等 | `DepositDialog` | `useDeposit` | BNB / USDT（BSC） | `POST /payment/deposit-record`（带 `benefitType`） | 会轮询 `/payment/verify/:txHash` 直到权益处理完成 |
| **PaymentOnly（仅支付）** | 订单支付、只记账 | `PaymentOnlyDialog` | `usePaymentOnly` | 同上 | `POST /payment/deposit-record`（**不传** benefit） | **默认不**触发权益逻辑、**不**轮询 verify |

底层复用：`Web3Provider`（连接钱包、切网）、`deposit/contract`（USDT `approve`、`pay`、等待 receipt）。

---

## 2. 前置条件

### 2.1 初始化 SDK

```ts
import { createSDK } from '@roy7274/user-center-sdk'

createSDK({
  userCenterUrl: process.env.NEXT_PUBLIC_USER_CENTER_URL!,
  appId: process.env.NEXT_PUBLIC_APP_ID!,
  bscNetwork: 'testnet', // 或 'mainnet'
  contractAddress: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS!,
  usdtAddress: process.env.NEXT_PUBLIC_USDT_ADDRESS!,
})
```

### 2.2 React 中使用链上能力

支付类组件依赖 **`Web3Provider`** 包裹（与 `DepositDialog` / `PaymentOnlyDialog` 相同）。请保证应用树中已挂载 SDK 推荐的 Provider 组合（如 `SDKProvider` 内已包含 Web3 上下文）。

### 2.3 用户标识 `userId`

两类流程在调用 User Center 时都需要 **User Center 的用户 ID**（字符串），用于归属校验：

- `DepositDialog` 通过 props：`userId`
- `PaymentOnlyDialog` 通过 `initialRequest.userId`
- `useDeposit` / `usePaymentOnly` 的请求体里同样需要 `userId`

---

## 3. Deposit：充值 + 权益（`DepositDialog` / `useDeposit`）

### 3.1 组件 `DepositDialog`

适用于「支付后需要积分等权益，并等待后端处理完成」的场景。

主要 props：

- `open` / `onOpenChange`：对话框显隐
- **`userId`**：必填，User Center 用户 ID
- `defaultTokenType`：默认 `USDT` 或 `BNB`
- `presetAmounts`：快捷金额按钮，默认 `[10, 50, 100, 500]`
- `onSuccess` / `onError`

当前内置提交逻辑会按金额构造 **积分类** `benefitType: 'points'` 的 `DepositRequest`（与 User Center 对 `benefit_amount` 的校验有关）。若你需要会员等其它权益类型，请直接使用 `useDeposit` 自行组装 `DepositRequest`。

### 3.2 Hook `useDeposit`

```ts
import { useDeposit } from '@roy7274/user-center-sdk'
import type { DepositRequest } from '@roy7274/user-center-sdk'

const { deposit, verifyDeposit, isLoading, step, error } = useDeposit()

await deposit({
  userId: 'user-center-user-id',
  tokenType: 'USDT',
  amount: '100',
  benefitType: 'points',
  benefitAmount: 1000,
  // membership 时还可传 membershipLevel、membershipDays 等
})
```

流程概要：连接钱包 → 切 BSC →（USDT）approve → 合约 `pay` → 等 receipt → `saveDepositRecord` → **轮询** `verifyDepositWithPolling`。

`DepositResult` 含 `txHash`、`status`、`benefitsGranted` 等。

---

## 4. PaymentOnly：仅支付 + 落库（`PaymentOnlyDialog` / `usePaymentOnly`）

适用于「只要链上支付成功并保存支付记录，**不要求**默认发放积分/会员、也**不**轮询权益」的场景（例如会员订单先支付、权益由其它接口触发）。

### 4.1 组件 `PaymentOnlyDialog`

```tsx
import { useState } from 'react'
import { PaymentOnlyDialog } from '@roy7274/user-center-sdk'

export function Checkout() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>去支付</button>
      <PaymentOnlyDialog
        open={open}
        onOpenChange={setOpen}
        initialRequest={{
          userId: 'user-center-user-id',
          tokenType: 'USDT',
          amount: '49.9',
          orderId: 'order-20260320-0001',
          orderName: '购买会员',
          metadata: { plan: 'SVIP' },
        }}
        allowEditAmount
        allowTokenChange
        locale="zh"
        onSuccess={(r) => {
          console.log(r.txHash, r.backendRecordId, r.backendPayload)
        }}
        onError={(e) => console.error(e)}
      />
    </>
  )
}
```

**`initialRequest` 说明：**

| 字段 | 说明 |
|------|------|
| `userId` | 必填 |
| `orderId` / `orderName` | 必填；用于界面展示，并会随 `savePaymentRecordOnly` 一并提交（见下文后端扩展） |
| `tokenType` / `amount` | 可选；未填金额时由用户在对话框内输入 |
| `metadata` | 可选；扩展业务字段，透传到保存接口（需后端支持） |

**可选行为：**

- `allowEditAmount`（默认 `true`）：是否允许改金额
- `allowTokenChange`（默认 `true`）：是否允许切换 USDT/BNB
- `locale`（默认 `'en'`）：`'zh'` 时界面为中文；金额输入框使用 `text-gray-900` 等样式保证数字清晰可读（英文模式下左侧保留 `$` 前缀）

### 4.2 Hook `usePaymentOnly`

```ts
import { usePaymentOnly } from '@roy7274/user-center-sdk'

const { pay, isLoading, step, error } = usePaymentOnly()

const result = await pay({
  userId: 'user-center-user-id',
  tokenType: 'BNB',
  amount: '0.1',
  orderId: 'ord-1',
  orderName: '某商品',
  metadata: { sku: 'x' },
})
// result: { txHash, status: 'confirmed', tokenType, amount, backendRecordId?, backendPayload? }
```

**`step` 取值（进度）：** `idle` → `connecting` → `approving`（仅 USDT 需 approve）→ `paying` → `waiting_receipt` → `saving_record` → 结束回到 `idle`。

成功时 **`status` 恒为 `'confirmed'`**（表示链上 receipt 已拿到且保存步骤未因非幂等错误失败）。若落库返回 **409（记录已存在）**，Hook 仍视为支付成功，但可能 **没有** `backendRecordId`（与 `useDeposit` 对 409 的容忍策略一致）。

---

## 5. 直接调用 API（非 React）

初始化 SDK 后可通过实例访问：

```ts
import { getSDK } from '@roy7274/user-center-sdk'

const sdk = getSDK()

// 带权益的充值记录（与 useDeposit 落库一致）
await sdk.deposit.saveDepositRecord({
  userId: '...',
  txHash: '0x...',
  tokenType: 'USDT',
  tokenAddress: '0x...',
  amount: '100',
  amountWei: '...',
  walletAddress: '0x...',
  network: 'BSC Testnet',
  timestamp: Math.floor(Date.now() / 1000),
  benefitType: 'points',
  benefitAmount: 1000,
})

// 仅保存支付记录：请求体不含 benefit_*，并带 Idempotency-Key: txHash
await sdk.deposit.savePaymentRecordOnly({
  userId: '...',
  txHash: '0x...',
  tokenType: 'USDT',
  tokenAddress: '0x...',
  amount: '49.9',
  amountWei: '...',
  walletAddress: '0x...',
  network: 'BSC Testnet',
  timestamp: Math.floor(Date.now() / 1000),
  orderId: 'order-001',
  orderName: '购买会员',
  metadata: { plan: 'SVIP' },
})
```

也可使用 `getDepositAPI()` 获取单例（与模块导出一致）。

**校验 / 轮询类接口（主要用于 Deposit 链路）：**

- `verifyDeposit(txHash, userId)`
- `verifyDepositWithPolling(txHash, userId, { interval, maxAttempts })`

---

## 6. 与 User Center 的约定

### 6.1 `POST /payment/deposit-record`

- 请求体中若包含 **`benefit_type` 为 points/membership**（或与你们后端约定等价的字段），后端可能在落库流程中 **发放权益**。
- **PaymentOnly** 路径通过 **`savePaymentRecordOnly`** 组装 body，**不包含** benefit 相关字段，从而避免默认走发放逻辑（以后端实际实现为准）。
- 重复提交同一笔链上交易时，常用 **`tx_hash` 幂等**；SDK 在 `savePaymentRecordOnly` 上会发送请求头 **`Idempotency-Key: txHash`**（若网关或 Controller 支持可加强一致性）。

### 6.2 订单类扩展字段

`orderId`、`orderName`、`metadata` 会出现在 `savePaymentRecordOnly` 的 JSON 中。**若当前 User Center DTO 未声明这些字段**，可能出现被忽略或校验失败，需要按 [`payment-only-modification-plan-zh.md`](./payment-only-modification-plan-zh.md) 第 3.3 节扩展后端后再启用。

### 6.3 请求字段命名

SDK 当前以 **camelCase** 序列化 JSON（如 `userId`、`txHash`）。若你的后端仅接受 **snake_case**，需要在网关层做转换或后续在 SDK 内统一适配（与现有 `saveDepositRecord` 行为保持一致）。

---

## 7. 错误处理提示

- **`DEPOSIT_ALREADY_EXISTS`（409）**  
  - Deposit：`useDeposit` 在部分情况下会忽略 409 并继续轮询 verify。  
  - PaymentOnly：`usePaymentOnly` 在链上已成功时忽略 409，成功返回但 `backendRecordId` 可能为空。

- 用户拒绝签名、余额不足、网络错误等会经 `normalizeError` 转为 SDK 错误类型；UI 层可通过 `onError` 或读取 `error` 展示文案。

---

## 8. 相关源码入口

| 内容 | 路径 |
|------|------|
| 充值 Hook | `src/hooks/useDeposit.ts` |
| 充值对话框 | `src/components/DepositDialog.tsx` |
| 仅支付 Hook / 对话框 | `src/payments/payment-only/usePaymentOnly.ts`、`PaymentOnlyDialog.tsx` |
| 类型 | `src/types/deposit.ts`、`src/payments/payment-only/types.ts` |
| HTTP 客户端 | `src/api/deposit-api.ts` |
| 合约调用 | `src/deposit/contract.ts` |

---

## 9. 版本说明

文档与实现对齐于本仓库当前主分支；包名以 **`package.json` 的 `name` 字段** 为准（示例使用 `@roy7274/user-center-sdk`）。升级 SDK 后请以类型定义与 CHANGELOG 为准。
