/**
 * Deposit API Client
 * 
 * Provides methods for deposit management operations:
 * - Save deposit records
 * - Verify deposit transactions with polling
 * - Handle idempotency (409 responses)
 * 
 * @module api/deposit-api
 */

import { getAPIClient, APIClientError } from './api-client'
import { APIError } from '../utils/error-handling'
import type {
  DepositRecord,
} from '../types/deposit'

/**
 * Save deposit record request
 */
export interface SaveDepositRecordRequest {
  userId: string
  txHash: string
  tokenType: 'BNB' | 'USDT'
  tokenAddress: string | null
  amount: string
  amountWei: string
  walletAddress: string
  network: string
  blockNumber?: number | null
  timestamp: number
  benefitType: 'points' | 'membership'
  benefitAmount?: number
  benefitLevel?: 'VIP' | 'SVIP'
  benefitExpireAt?: number | null
}

/**
 * 仅保存支付记录（不传 benefit），对应 PaymentOnly 流程。
 * orderId / orderName / metadata 需 user-center 扩展 DTO 后才会持久化。
 */
export interface SavePaymentRecordOnlyRequest {
  userId: string
  txHash: string
  tokenType: 'BNB' | 'USDT'
  tokenAddress: string | null
  amount: string
  amountWei: string
  walletAddress: string
  network: string
  blockNumber?: number | null
  timestamp: number
  orderId?: string
  orderName?: string
  metadata?: Record<string, unknown>
}

/**
 * Verify deposit response
 */
export interface VerifyDepositResponse {
  /**
   * user-center 的原始 deposit_record（用于需要更细节时）
   */
  record: DepositRecord
  benefitsGranted: boolean
}

/**
 * Deposit API class
 */
export class DepositAPI {
  /**
   * Save deposit record - save a deposit transaction record to the backend
   * 
   * @param request - Deposit record details including txHash, tokenType, amount, and benefit info
   * @returns Saved deposit record
   * 
   * @throws APIClientError with code 'DEPOSIT_ALREADY_EXISTS' if record already exists (409)
   * 
   * @example
   * ```typescript
   * const depositApi = new DepositAPI()
   * try {
   *   const record = await depositApi.saveDepositRecord({
   *     txHash: '0x123...',
   *     tokenType: 'USDT',
   *     amount: '100.00',
   *     benefitType: 'points',
   *     benefitAmount: 1000
   *   })
   *   console.log(`Deposit record saved: ${record.id}`)
   * } catch (error) {
   *   if (error.code === 'DEPOSIT_ALREADY_EXISTS') {
   *     console.log('Deposit already recorded')
   *   }
   * }
   * ```
   */
  async saveDepositRecord(request: SaveDepositRecordRequest): Promise<DepositRecord> {
    const client = getAPIClient()
    
    try {
      return await client.post<DepositRecord>('/deposit/save', request)
    } catch (error) {
      // Handle 409 Conflict (idempotency - record already exists)
      if ((error instanceof APIClientError || error instanceof APIError) && error.statusCode === 409) {
        // Re-throw with a more specific error code for easier handling
        throw new APIError(
          error.message || 'Deposit record already exists',
          'DEPOSIT_ALREADY_EXISTS',
          409,
          error.details
        )
      }
      throw error
    }
  }

  /**
   * 仅保存支付记录：调用 `/payment/deposit-record` 且不携带 benefit 相关字段，
   * 避免 user-center 触发积分/会员发放。
   */
  async savePaymentRecordOnly(
    request: SavePaymentRecordOnlyRequest
  ): Promise<DepositRecord> {
    const client = getAPIClient()

    const body: Record<string, unknown> = {
      userId: request.userId,
      txHash: request.txHash,
      tokenType: request.tokenType,
      tokenAddress: request.tokenAddress,
      amount: request.amount,
      amountWei: request.amountWei,
      walletAddress: request.walletAddress,
      network: request.network,
      timestamp: request.timestamp,
    }
    if (request.blockNumber != null) {
      body.blockNumber = request.blockNumber
    }
    if (request.orderId != null) body.orderId = request.orderId
    if (request.orderName != null) body.orderName = request.orderName
    if (request.metadata != null) body.metadata = request.metadata

    try {
      return await client.post<DepositRecord>('/payment/deposit-record', body, {
        headers: { 'Idempotency-Key': request.txHash },
      })
    } catch (error) {
      if ((error instanceof APIClientError || error instanceof APIError) && error.statusCode === 409) {
        throw new APIError(
          error.message || 'Deposit record already exists',
          'DEPOSIT_ALREADY_EXISTS',
          409,
          error.details
        )
      }
      throw error
    }
  }

  /**
   * Verify deposit - check if deposit transaction has been confirmed and benefits granted
   * 
   * @param txHash - Transaction hash to verify
   * @returns Verification response with deposit record and benefits status
   * 
   * @example
   * ```typescript
   * const depositApi = new DepositAPI()
   * const result = await depositApi.verifyDeposit('0x123...')
   * if (result.benefitsGranted) {
   *   console.log('Benefits have been granted!')
   * } else {
   *   console.log(`Status: ${result.record.status}`)
   * }
   * ```
   */
  async verifyDeposit(
    txHash: string,
    userId?: string
  ): Promise<VerifyDepositResponse> {
    const client = getAPIClient()
    const res = await client.get<VerifyDepositResponse>(`/deposit/verify`, {
      params: {
        txHash,
        ...(userId ? { user_id: userId } : {}),
      },
    })

    if (!res?.record) {
      throw new APIError(
        'Invalid deposit verification response',
        'DEPOSIT_VERIFY_INVALID_RESPONSE',
        undefined,
        { txHash }
      )
    }

    return res
  }

  /**
   * Verify deposit with polling - poll the verify endpoint until benefits are granted or timeout
   * 
   * @param txHash - Transaction hash to verify
   * @param options - Polling options (interval, maxAttempts)
   * @returns Verification response when benefits are granted
   * 
   * @throws Error if polling times out before benefits are granted
   * 
   * @example
   * ```typescript
   * const depositApi = new DepositAPI()
   * try {
   *   const result = await depositApi.verifyDepositWithPolling('0x123...', {
   *     interval: 3000,  // Poll every 3 seconds
   *     maxAttempts: 20  // Try for 60 seconds total
   *   })
   *   console.log('Deposit verified and benefits granted!')
   * } catch (error) {
   *   console.error('Verification timeout or failed')
   * }
   * ```
   */
  async verifyDepositWithPolling(
    txHash: string,
    userIdOrOptions?: string | {
      interval?: number
      maxAttempts?: number
    },
    maybeOptions: {
      interval?: number
      maxAttempts?: number
    } = {}
  ): Promise<VerifyDepositResponse> {
    const userId = typeof userIdOrOptions === 'string' ? userIdOrOptions : undefined
    const options =
      typeof userIdOrOptions === 'string' ? maybeOptions : (userIdOrOptions ?? {})

    const { interval = 3000, maxAttempts = 20 } = options
    
    let attempts = 0
    
    while (attempts < maxAttempts) {
      attempts++
      
      try {
        const result = await this.verifyDeposit(txHash, userId)
        
        // If benefits are granted, return immediately
        if (result.benefitsGranted) {
          return result
        }

        // If deposit failed, stop polling and throw.
        if (result.record.status === 'failed') {
          throw new APIError(
            'Deposit verification failed',
            'DEPOSIT_FAILED',
            undefined,
            { txHash, record: result.record }
          )
        }
        
        // If not the last attempt, wait before polling again
        if (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, interval))
        }
      } catch (error) {
        // If it's a known error (failed deposit), re-throw
        if ((error instanceof APIClientError || error instanceof APIError) && error.code === 'DEPOSIT_FAILED') {
          throw error
        }
        
        // For other errors, if it's the last attempt, throw
        if (attempts >= maxAttempts) {
          throw error
        }
        
        // Otherwise, wait and retry
        await new Promise(resolve => setTimeout(resolve, interval))
      }
    }
    
    // Timeout - benefits not granted within max attempts
    throw new APIError(
      `Deposit verification timeout after ${maxAttempts} attempts`,
      'VERIFICATION_TIMEOUT',
      undefined,
      { txHash, attempts: maxAttempts }
    )
  }
}

/**
 * Create a new DepositAPI instance
 */
export function createDepositAPI(): DepositAPI {
  return new DepositAPI()
}

/**
 * Default DepositAPI instance (singleton)
 */
let defaultDepositAPI: DepositAPI | null = null

/**
 * Get the default DepositAPI instance
 */
export function getDepositAPI(): DepositAPI {
  if (!defaultDepositAPI) {
    defaultDepositAPI = createDepositAPI()
  }
  return defaultDepositAPI
}

/**
 * Reset the default DepositAPI instance (mainly for testing)
 */
export function resetDepositAPI(): void {
  defaultDepositAPI = null
}
