/**
 * useCheckIn Hook
 * 
 * React hook for managing daily check-in functionality with idempotency handling.
 * 
 * Features:
 * - Daily check-in with automatic error handling
 * - Track check-in state (isCheckedIn)
 * - Handle idempotency (already checked in today)
 * - Loading and error state management
 * 
 * @module hooks/useCheckIn
 */

import { useState, useCallback } from 'react'
import { getPointsAPI } from '../api/points-api'
import type { CheckInResult } from '../types/points'

/**
 * useCheckIn hook return type
 */
export interface UseCheckInReturn {
  checkIn: () => Promise<CheckInResult>
  isCheckedIn: boolean
  isLoading: boolean
  error: Error | null
}

/**
 * useCheckIn - React hook for daily check-in management
 * 
 * Provides a method to perform daily check-in and tracks the check-in state.
 * Handles idempotency by catching "already checked in" errors and updating
 * the isCheckedIn state accordingly.
 * 
 * @returns Object containing checkIn method, check-in state, loading state, and error
 * 
 * @example
 * ```typescript
 * function CheckInButton() {
 *   const { checkIn, isCheckedIn, isLoading, error } = useCheckIn()
 * 
 *   const handleCheckIn = async () => {
 *     try {
 *       const result = await checkIn()
 *       console.log(`Earned ${result.points} points!`)
 *       console.log(`Consecutive days: ${result.consecutiveDays}`)
 *     } catch (err) {
 *       console.error('Check-in failed:', err)
 *     }
 *   }
 * 
 *   return (
 *     <button 
 *       onClick={handleCheckIn} 
 *       disabled={isCheckedIn || isLoading}
 *     >
 *       {isCheckedIn ? 'Checked In' : 'Check In'}
 *     </button>
 *   )
 * }
 * ```
 */
export function useCheckIn(): UseCheckInReturn {
  const [isCheckedIn, setIsCheckedIn] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  /**
   * Perform daily check-in
   * 
   * Calls the points API to perform check-in. Handles idempotency by
   * catching "already checked in" errors and updating state accordingly.
   * 
   * @returns Check-in result with points earned and consecutive days
   * @throws Error if check-in fails for reasons other than already checked in
   */
  const checkIn = useCallback(async (): Promise<CheckInResult> => {
    // Don't allow check-in if already checked in
    if (isCheckedIn) {
      const alreadyCheckedInResult: CheckInResult = {
        success: false,
        points: 0,
        consecutiveDays: 0,
        message: 'Already checked in today',
      }
      return alreadyCheckedInResult
    }

    setIsLoading(true)
    setError(null)

    try {
      const pointsAPI = getPointsAPI()
      const result = await pointsAPI.checkIn()

      // Mark as checked in on success
      if (result.success) {
        setIsCheckedIn(true)
      }

      return result
    } catch (err) {
      const error = err as Error & { code?: string }

      // Handle "already checked in" error as a special case
      if (error.code === 'ALREADY_CHECKED_IN') {
        setIsCheckedIn(true)
        
        // Return a result indicating already checked in
        const alreadyCheckedInResult: CheckInResult = {
          success: false,
          points: 0,
          consecutiveDays: 0,
          message: error.message || 'Already checked in today',
        }
        
        return alreadyCheckedInResult
      }

      // For other errors, set error state and rethrow
      setError(error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [isCheckedIn])

  return {
    checkIn,
    isCheckedIn,
    isLoading,
    error,
  }
}
