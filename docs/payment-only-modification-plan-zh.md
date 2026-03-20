# PaymentOnly（仅支付）改造方案（中文版）

## 1. 背景与现状

当前 SDK 的“充值/支付”入口通常是 `DepositDialog` + `useDeposit` 这一套链路：

1. 钱包交互：连接钱包、切换到 BSC、检查余额（USDT 需要先 approve），然后调用支付合约 `pay`
2. 链上确认：等待交易回执（receipt）
3. 写入后端充值记录：SDK 将其视为“保存充值/支付记录”
4. 轮询校验并发放权益：直到积分/会员权益发放完成（或达到超时）

在你当前 `user-center` 实现里，“发放权益”与“保存充值记录”耦合在同一个接口里（保存充值记录接口负责触发权益发放逻辑）：
- 当 `POST /payment/deposit-record` 请求体里包含 `benefit_type=points` 或 `benefit_type=membership` 时，后端会在保存流程中发放权益
- 当 `benefit_type` 省略/为空时，后端只会保存支付记录，不会发放权益

因此，如果你希望 SDK 支付变成“仅支付”：支付成功后返回信息并保存支付记录，但**默认不强制进行积分/会员权益发放，也不强制轮询权益结果**，就需要把能力拆成两种模式：
- `Deposit`：支付 + 权益发放 +（可选）轮询校验
- `PaymentOnly`：仅支付 + 保存记录 + 返回成功结果（权益可选）

## 2. 目标

提供一套“PaymentOnly（仅支付）”能力，满足：

1. 支付窗口（Dialog）支持字段可扩展性
   - 打开窗口时就能预置：
     - 支付金额（`amount`）
     - 币种（`tokenType`：USDT / BNB）
     - 支付名称（例如：购买会员）
     - 订单编号（`orderId`）
     - 其他可扩展字段（例如 membership 参数、metadata 等）
2. 支付成功返回信息
   - 至少返回 `txHash`、最终状态（至少 confirmed 成功）以及后端落库的记录信息（如 recordId）
3. 支付记录正确存储
   - 优先复用现有的“充值记录保存”能力：在 `user-center` 落库支付信息
   - 若你要求把 `orderId/orderName` 等业务字段也落库，需要在后端 DTO/实体/表结构上做扩展
4. 默认不触发权益发放与轮询
   - `PaymentOnly` 模式下默认不轮询权益结果（必要时可提供可选轮询/可选发放能力）

## 3. 推荐总体方案

### 3.1 在 SDK 新增 PaymentOnly 模块

新增：
- `PaymentOnlyDialog`（UI：仅支付对话框）
- `usePaymentOnly`（Hook：仅支付业务逻辑）

复用：
- 复用现有钱包连接/切换网络的 `Web3Provider`
- 复用现有合约交互方法：USDT approve + 合约 `pay` + 等待 receipt

### 3.2 后端优先复用现有接口（最小改动）

优先复用当前 `user-center` 的保存接口：
- `POST /payment/deposit-record`

方式：
- 在 `PaymentOnly` 场景下：**不传 `benefit_type`**（或传 null/空）
- 后端不会触发 `processBenefit()`，从而达到“只保存支付记录、不发放积分/会员权益”的效果

注意：
- 现有充值记录 DTO/实体目前不含 `orderId / orderName` 等业务字段
- 如果你要求“订单编号/支付名称要存储”，需要后端扩展（见 3.3）

### 3.3 若要落库 orderId/orderName：后端扩展点（可选）

建议增加（可从最小集合开始）：
- `order_id`：string（订单编号，建议与幂等设计配合）
- `order_name`：string（支付名称）
- `order_type`：可选 string（用于区分不同业务，比如 membership / points 等）
- `metadata`：可选 jsonb（通用扩展字段）

落地方式：
1. 扩展 `DepositRecordDto`（或新增对应 PaymentOnly DTO）
2. 扩展 `DepositRecordEntity` 与数据库表结构
3. 更新 `PaymentController` 与 `PaymentService` 的持久化逻辑

## 4. SDK 设计（对外 API）

### 4.1 PaymentOnlyDialog（UI 组件）

建议调用方式：

```ts
<PaymentOnlyDialog
  open={open}
  onOpenChange={setOpen}
  initialRequest={{
    tokenType: 'USDT',
    amount: '49.9',
    orderId: 'order-20260320-0001',
    orderName: '购买会员',
    // 扩展字段（透传透落库：取决于后端是否扩展）
    metadata: { membershipLevel: 'SVIP', membershipDays: 30 },
  }}
  onSuccess={(result) => {
    console.log(result.txHash)
    console.log(result.backendRecordId)
  }}
  onError={(err) => console.error(err)}
/>
```

UI 需求建议：
- 支持字段预置（`initialRequest`）
- 支持是否允许用户编辑金额（按业务决定）
- 清晰展示 token、金额、订单标识（orderId/orderName）
- 扩展字段透传（metadata 等）

### 4.2 usePaymentOnly（Hook）

建议 hook 返回：
- `pay(request)`：发起支付
- `isLoading` / `step` / `error`：支付进度与错误状态

`pay()` 成功返回：
- `txHash`
- `status`（至少 confirmed）
- `backendRecordId`（后端返回的存储记录 id；若现接口不返回，则需要约定或再查询）
- `backendPayload`（可选：后端原始回包透出）

## 5. SDK 内部流程（PaymentOnly）

建议的状态机（state machine）：

1. `idle`
2. `connecting`（若钱包未连接则连接）
3. `approving`（仅 USDT：approve 流程）
4. `paying`（调用合约 `pay`）
5. `waiting_receipt`（等待交易回执）
6. `saving_record`（调用 `POST /payment/deposit-record` 保存记录；默认不带 benefit）
7. `success` / `error`

关键点：
- `saving_record` 成功后立刻触发 `onSuccess`
- 默认不调用权益轮询接口（如后续你确实需要“确保权益发放”，可以通过可选项启用另一条链路）

## 6. 契约与数据结构（建议）

### 6.1 PaymentOnlyRequest（前端入参）

建议最小集合：
- `tokenType`：`'USDT' | 'BNB'`
- `amount`：string（保留原始精度）
- `orderId`：string（业务订单编号）
- `orderName`：string（展示用名称）
- `userId`：string（user-center 的用户 id）
- `metadata?`：可选对象（用于扩展字段）

### 6.2 保存支付记录请求体（兼容 user-center）

最小字段（用于复用你现有的 DTO 映射）：
- `user_id`
- `tx_hash`
- `token_type`
- `token_address`（BNB 场景可传 null）
- `amount`
- `amount_wei`
- `wallet_address`
- `network`
- `block_number?`
- `timestamp`

权益相关：
- `benefit_type`：不传 / 传 null / 传空（确保不会触发积分/会员发放）

如果你扩展后端：
- 可加入 `order_id`、`order_name`、`metadata` 等

## 7. 幂等策略

建议至少保证一类幂等键一致：
- 以 `tx_hash` 做幂等（user-center 已按 `txHash` 查重）
- 如果你扩展了落库 `order_id`，则可再提供 `order_id` 幂等（取决于后端设计）

SDK 可选加请求头：
- `Idempotency-Key: tx_hash`

如后端 controller 支持：可以用 `Idempotency-Key` 与 `tx_hash` 做一致性校验/兜底。

## 8. 兼容与迁移建议

1. 不破坏现有 `DepositDialog / useDeposit`
2. 新增 `PaymentOnlyDialog / usePaymentOnly`
3. 复用底层钱包与合约支付能力（保持交易链路一致）
4. 逐步把业务购买会员、checkout 等流程迁移到 `PaymentOnly`

## 9. 落地步骤（推荐）

1. 在 SDK 内新增模块：
   - `src/payments/payment-only`（types / hook / dialog）
   - SDK 内新增后端 client 方法：`savePaymentRecordOnly()`，调用 `/payment/deposit-record` 时不带 benefit
2. 在 SDK 文档中补充：
   - PaymentOnly 的使用示例（initialRequest 如何预置字段）
   - 支持 metadata 扩展的约束说明
3. （可选）后端扩展 order 字段：
   - DTO/实体/表结构添加 `order_id/order_name/metadata`
4. 联调与验收：
   - 支付成功后 SDK 返回 `txHash`
   - user-center 正常落库 payment record
   - 不触发 points/membership benefit（或 benefit 按你可选配置工作）

