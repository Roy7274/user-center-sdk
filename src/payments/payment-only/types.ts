import type { TokenType } from '../../types/deposit'

export type PaymentOnlyStep =
  | 'idle'
  | 'connecting'
  | 'approving'
  | 'paying'
  | 'waiting_receipt'
  | 'saving_record'

/**
 * PaymentOnly 完整支付请求（链上 + 落库）
 */
export interface PaymentOnlyRequest {
  userId: string
  tokenType: TokenType
  amount: string
  orderId: string
  orderName: string
  metadata?: Record<string, unknown>
}

export interface PaymentOnlyResult {
  txHash: string
  status: 'confirmed'
  tokenType: TokenType
  amount: string
  backendRecordId?: string
  backendPayload?: unknown
}

/**
 * 打开对话框时的预置字段（金额等可省略，由用户填写）
 */
export interface PaymentOnlyInitialRequest {
  userId: string
  tokenType?: TokenType
  amount?: string
  orderId: string
  orderName: string
  metadata?: Record<string, unknown>
}
