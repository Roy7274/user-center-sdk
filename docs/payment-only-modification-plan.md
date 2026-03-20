# Payment-Only (Only Payment) Modification Plan

## 1. Background & Current State

The current SDK "deposit/payment" entry typically uses `DepositDialog` + `useDeposit`:

1. Wallet interaction: connect wallet, switch to BSC, check balances, and approve USDT (if needed), then call the payment contract `pay`
2. On-chain confirmation: wait for the transaction receipt
3. Save deposit record to backend (the SDK treats this as "saving deposit/payment record")
4. Poll verification and then grant benefits (points/membership)

In your current `user-center` implementation, benefit granting is coupled with `POST /payment/deposit-record`:
- When the request includes `benefit_type=points` or `benefit_type=membership`, the backend grants benefits during the save flow
- When `benefit_type` is omitted / null, the backend saves the payment record but does not grant benefits

If you want SDK payment to be "only payment" (return success info and store the record, without forcing benefit granting), you should split the capability into two modes:
- `Deposit` (payment + benefit granting + polling)
- `PaymentOnly` (payment + save record + return success; benefits optional)

## 2. Goals

Provide a payment-only capability for orders that meets:

1. Payment dialog must support extensible fields
   - When opening the dialog, you can pre-fill:
     - `amount`
     - `tokenType` (USDT / BNB)
     - Payment name (e.g. "buy membership")
     - Order number (`orderId`)
     - Other expandable business fields
2. Return payment success information
   - Return at least `txHash`, final status, and backend saved record info (e.g. recordId)
3. Save payment record correctly
   - Persist a record in `user-center`
   - Minimum: reuse existing deposit record storage without benefits
   - If you must persist `orderId/orderName`, extend backend DTO/entity accordingly
4. Do not require benefit granting / benefit verification polling by default

## 3. Recommended Architecture

### 3.1 Add a new `PaymentOnly` module in the SDK

Introduce:
- `PaymentOnlyDialog` (UI)
- `usePaymentOnly` (Hook / business logic)

Reuse:
- `Web3Provider` (wallet connect, switch network)
- existing contract interaction utilities (USDT approve + contract `pay` + wait receipt)

### 3.2 Reuse the existing backend endpoint (minimum changes)

Prefer reusing:
- `POST /payment/deposit-record`

In `PaymentOnly` mode:
- Do not send `benefit_type` (or send null/empty)
- Backend will not call `processBenefit()` and thus will not grant points/membership

The backend will still persist core payment fields.

Note:
- Current `deposit_records` DTO/entity do not include `orderId/orderName`
- If you want them stored, backend extension is required (see 3.3)

### 3.3 Optional backend extension: persist `orderId/orderName`

Add optional fields:
- `order_id`: string
- `order_name`: string
- `order_type`: optional string
- `metadata`: optional `jsonb` for extensibility

Implement:
1. Extend `DepositRecordDto` to accept those optional fields
2. Extend `DepositRecordEntity` + DB table columns
3. Update controller/service to persist the values

This enables "extensible fields" end-to-end.

## 4. SDK Interface Design (Public API)

### 4.1 `PaymentOnlyDialog`

Example usage:

```ts
<PaymentOnlyDialog
  open={open}
  onOpenChange={setOpen}
  initialRequest={{
    tokenType: 'USDT',
    amount: '49.9',
    orderId: 'order-20260320-0001',
    orderName: 'Buy Membership',
    metadata: { membershipLevel: 'SVIP', membershipDays: 30 },
  }}
  onSuccess={(result) => {
    console.log(result.txHash)
    console.log(result.backendRecordId)
  }}
  onError={(err) => console.error(err)}
/>
```

UI requirements:
- prefilled request fields (`initialRequest`)
- optional editability (whether user can change amount)
- show token + amount + order identity
- pass through extensible fields (`metadata`)

### 4.2 `usePaymentOnly` Hook

Hook returns:
- `pay(request)`
- `isLoading`, `step`, `error`

On success:
- `txHash`
- `status` (at least confirmed)
- `backendRecordId`
- optionally `backendPayload`

## 5. `PaymentOnly` Flow (State Machine)

Suggested states:
- `idle`
- `connecting`
- `approving` (USDT only)
- `paying`
- `waiting_receipt`
- `saving_record`
- `success` / `error`

Key points:
- After `saving_record` completes, call `onSuccess`
- Default: do not poll benefit verification endpoints

## 6. Contracts & Data Structures (Suggested)

### 6.1 `PaymentOnlyRequest` (Frontend)

Minimum:
- `tokenType`: `'USDT' | 'BNB'`
- `amount`: string
- `orderId`: string
- `orderName`: string
- `userId`: string
- `metadata?`: optional object

### 6.2 Request body for saving record

Minimum fields (reuse current DTO mapping):
- `user_id`
- `tx_hash`
- `token_type`
- `token_address` (BNB: null)
- `amount`
- `amount_wei`
- `wallet_address`
- `network`
- `block_number?`
- `timestamp`

Benefits:
- omit `benefit_type` (or set null/empty) to avoid grant logic

With backend extension:
- include `order_id`, `order_name`, `metadata`

## 7. Idempotency Strategy

Use both (optional):
- `tx_hash` idempotency (already handled by `user-center`查重 on txHash)
- `order_id` idempotency if you extend backend storage

Optionally set header:
- `Idempotency-Key: tx_hash`

Controller logic can validate/derive tx_hash when header exists.

## 8. Compatibility & Migration

1. Do not break existing `DepositDialog / useDeposit`
2. Add `PaymentOnlyDialog / usePaymentOnly`
3. Reuse wallet + contract payment internals
4. Migrate business flows (buy membership, product checkout) to `PaymentOnly`

## 9. Implementation Steps (Recommended)

1. Add SDK module:
   - `src/payments/payment-only` (types/hook/dialog)
   - backend client method: `savePaymentRecordOnly()` calling `/payment/deposit-record` without benefits
2. Add SDK docs/examples for field extensibility and usage
3. Optional backend changes for persisting `orderId/orderName/metadata`
4. Integration test:
   - verify:
     - payment tx succeeds
     - SDK returns `txHash`
     - backend record saved
     - no benefit granting

