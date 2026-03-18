/**
 * Member level enumeration
 */
export type MemberLevelType = 'FREE' | 'VIP' | 'SVIP'

/**
 * Member level information
 */
export interface MemberLevel {
  level: MemberLevelType
  name: string
  benefits: string[]
}

/**
 * Points balance information
 */
export interface PointsBalance {
  available: number
  frozen: number
  total: number
  level: MemberLevel
  levelExpireAt?: string
}

/**
 * Points transaction type
 */
export type PointsTransactionType = 'earn' | 'spend' | 'expire' | 'refund'

/**
 * Points transaction source
 */
export type PointsTransactionSource =
  | 'checkin'
  | 'deposit'
  | 'membership'
  | 'promotion'
  | 'consumption'

/**
 * Points ledger entry
 */
export interface PointsLedgerEntry {
  id: string
  userId: string
  amount: number
  type: PointsTransactionType
  source: PointsTransactionSource
  description: string
  balance: number
  expireAt?: string
  createdAt: string
}

/**
 * Points ledger response with pagination
 */
export interface PointsLedgerResponse {
  items: PointsLedgerEntry[]
  total: number
  page: number
  pageSize: number
}

/**
 * Check-in result
 */
export interface CheckInResult {
  success: boolean
  points: number
  consecutiveDays: number
  message: string
}
