/**
 * usePoints Hook
 * 
 * React hook for managing points balance with SWR-based caching and revalidation.
 * 
 * Features:
 * - Automatic data fetching and caching
 * - Loading and error state management
 * - Manual refresh capability
 * - Automatic revalidation on focus/reconnect
 * 
 * @module hooks/usePoints
 */

import useSWR from 'swr'
import { getPointsAPI } from '../api/points-api'
import type { PointsBalance } from '../types/points'

/**
 * SWR key for points balance
 */
const POINTS_BALANCE_KEY = '/points/balance'

/**
 * Fetcher function for SWR
 */
async function fetchPointsBalance(): Promise<PointsBalance> {
  const pointsAPI = getPointsAPI()
  return pointsAPI.getBalance()
}

/**
 * usePoints hook return type
 */
export interface UsePointsReturn {
  balance: PointsBalance | null
  isLoading: boolean
  error: Error | null
  refresh: () => Promise<void>
}

/**
 * usePoints - React hook for points balance management
 * 
 * Uses SWR for efficient data fetching with automatic caching, revalidation,
 * and error handling. The hook automatically refetches data when the window
 * regains focus or network reconnects.
 * 
 * @returns Object containing balance data, loading state, error, and refresh method
 * 
 * @example
 * ```typescript
 * function PointsDisplay() {
 *   const { balance, isLoading, error, refresh } = usePoints()
 * 
 *   if (isLoading) return <div>Loading...</div>
 *   if (error) return <div>Error: {error.message}</div>
 *   if (!balance) return null
 * 
 *   return (
 *     <div>
 *       <p>Available: {balance.available} points</p>
 *       <p>Level: {balance.level.level}</p>
 *       <button onClick={refresh}>Refresh</button>
 *     </div>
 *   )
 * }
 * ```
 */
export function usePoints(): UsePointsReturn {
  const { data, error, isLoading, mutate } = useSWR<PointsBalance, Error>(
    POINTS_BALANCE_KEY,
    fetchPointsBalance,
    {
      // Revalidate on window focus
      revalidateOnFocus: true,
      // Revalidate on network reconnect
      revalidateOnReconnect: true,
      // Don't revalidate on mount if data exists
      revalidateIfStale: true,
      // Dedupe requests within 2 seconds
      dedupingInterval: 2000,
    }
  )

  /**
   * Refresh points balance
   * Forces a revalidation of the data
   */
  const refresh = async (): Promise<void> => {
    await mutate()
  }

  return {
    balance: data ?? null,
    isLoading,
    error: error ?? null,
    refresh,
  }
}
