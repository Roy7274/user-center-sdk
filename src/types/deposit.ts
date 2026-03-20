/**
 * Token type for payments
 */
export type TokenType = 'BNB' | 'USDT'

/**
 * Benefit type for deposits
 */
export type BenefitType = 'points' | 'membership'

/**
 * Deposit transaction status
 */
export type DepositStatus = 'pending' | 'confirmed' | 'failed'

/**
 * Deposit request
 */
export interface DepositRequest {
  /**
   * User Center 用户 ID（user-center 的 DepositRecordDto 必填）
   * 该字段用于在 `/payment/deposit-record` 与 `/payment/verify/:txHash` 中校验归属。
   */
  userId: string
  tokenType: TokenType
  amount: string
  benefitType: BenefitType
  benefitAmount?: number
  membershipLevel?: 'VIP' | 'SVIP'
  membershipDays?: number
}

/**
 * Deposit result
 */
export interface DepositResult {
  txHash: string
  tokenType: TokenType
  amount: string
  status: DepositStatus
  benefitsGranted: boolean
}

/**
 * Deposit record from API
 */
export interface DepositRecord {
  id: string
  userId: string
  txHash: string
  tokenType: TokenType
  amount: string
  usdAmount: number
  benefitType: BenefitType
  benefitAmount?: number
  membershipLevel?: 'VIP' | 'SVIP'
  status: DepositStatus
  createdAt: string
  confirmedAt?: string
}

/**
 * Blockchain transaction
 */
export interface DepositTransaction {
  txHash: string
  tokenType: TokenType
  amount: string
  fromAddress: string
  toAddress: string
  status: DepositStatus
  blockNumber?: number
  timestamp?: number
}

/**
 * Deposit step state
 */
export type DepositStep =
  | 'idle'
  | 'connecting'
  | 'approving'
  | 'depositing'
  | 'verifying'
