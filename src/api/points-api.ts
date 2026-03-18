/**
 * Points API Client
 * 
 * Provides methods for points management operations:
 * - Get points balance
 * - Get points ledger with pagination
 * - Daily check-in
 * 
 * @module api/points-api
 */

import { getAPIClient } from './api-client'
import type {
  PointsBalance,
  PointsLedgerResponse,
  CheckInResult,
} from '../types/points'

/**
 * Points ledger query parameters
 */
export interface PointsLedgerQuery {
  page?: number
  pageSize?: number
}

/**
 * Points API class
 */
export class PointsAPI {
  /**
   * Get points balance - retrieve current points balance and member level
   * 
   * @returns Points balance with available, frozen, total points and member level
   * 
   * @example
   * ```typescript
   * const pointsApi = new PointsAPI()
   * const balance = await pointsApi.getBalance()
   * console.log(`Available points: ${balance.available}`)
   * console.log(`Member level: ${balance.level.level}`)
   * ```
   */
  async getBalance(): Promise<PointsBalance> {
    const client = getAPIClient()
    return client.get<PointsBalance>('/points/balance')
  }

  /**
   * Get points ledger - retrieve points transaction history with pagination
   * 
   * @param query - Query parameters for pagination (page, pageSize)
   * @returns Paginated points ledger with transaction entries
   * 
   * @example
   * ```typescript
   * const pointsApi = new PointsAPI()
   * const ledger = await pointsApi.getLedger({ page: 1, pageSize: 20 })
   * console.log(`Total transactions: ${ledger.total}`)
   * ledger.items.forEach(entry => {
   *   console.log(`${entry.type}: ${entry.amount} points - ${entry.description}`)
   * })
   * ```
   */
  async getLedger(query: PointsLedgerQuery = {}): Promise<PointsLedgerResponse> {
    const client = getAPIClient()
    const params: Record<string, string | number> = {}
    
    if (query.page !== undefined) {
      params.page = query.page
    }
    if (query.pageSize !== undefined) {
      params.pageSize = query.pageSize
    }
    
    return client.get<PointsLedgerResponse>('/points/ledger', { params })
  }

  /**
   * Daily check-in - perform daily check-in to earn points
   * 
   * @returns Check-in result with points earned and consecutive days
   * 
   * @example
   * ```typescript
   * const pointsApi = new PointsAPI()
   * try {
   *   const result = await pointsApi.checkIn()
   *   console.log(`Earned ${result.points} points!`)
   *   console.log(`Consecutive days: ${result.consecutiveDays}`)
   * } catch (error) {
   *   if (error.code === 'ALREADY_CHECKED_IN') {
   *     console.log('Already checked in today')
   *   }
   * }
   * ```
   */
  async checkIn(): Promise<CheckInResult> {
    const client = getAPIClient()
    return client.post<CheckInResult>('/points/checkin')
  }
}

/**
 * Create a new PointsAPI instance
 */
export function createPointsAPI(): PointsAPI {
  return new PointsAPI()
}

/**
 * Default PointsAPI instance (singleton)
 */
let defaultPointsAPI: PointsAPI | null = null

/**
 * Get the default PointsAPI instance
 */
export function getPointsAPI(): PointsAPI {
  if (!defaultPointsAPI) {
    defaultPointsAPI = createPointsAPI()
  }
  return defaultPointsAPI
}

/**
 * Reset the default PointsAPI instance (mainly for testing)
 */
export function resetPointsAPI(): void {
  defaultPointsAPI = null
}
