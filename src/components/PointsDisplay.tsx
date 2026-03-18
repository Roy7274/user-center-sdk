'use client'

import { useCallback } from 'react'
import { usePoints } from '../hooks/usePoints'
import { useCheckIn } from '../hooks/useCheckIn'
import type { CheckInResult } from '../types/points'

/**
 * PointsDisplay props interface
 */
export interface PointsDisplayProps {
  showLevel?: boolean
  showCheckIn?: boolean
  onCheckInSuccess?: (result: CheckInResult) => void
  className?: string
}

/**
 * PointsDisplay component
 * Displays user's points balance, member level, and provides check-in functionality
 */
export function PointsDisplay({
  showLevel = true,
  showCheckIn = true,
  onCheckInSuccess,
  className = '',
}: PointsDisplayProps) {
  const { balance, isLoading: isLoadingPoints, error: pointsError } = usePoints()
  const { checkIn, isCheckedIn, isLoading: isCheckingIn, error: checkInError } = useCheckIn()

  // Handle check-in button click
  const handleCheckIn = useCallback(async () => {
    try {
      const result = await checkIn()
      if (result.success) {
        onCheckInSuccess?.(result)
      }
    } catch (err) {
      // Error is already handled by useCheckIn hook
      console.error('Check-in failed:', err)
    }
  }, [checkIn, onCheckInSuccess])

  // Show loading state
  if (isLoadingPoints) {
    return (
      <div className={`rounded-lg bg-white p-6 shadow ${className}`}>
        <div className="flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <span className="ml-3 text-gray-600">Loading points...</span>
        </div>
      </div>
    )
  }

  // Show error state
  if (pointsError) {
    return (
      <div className={`rounded-lg bg-white p-6 shadow ${className}`}>
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-800">
          <p className="font-medium">Failed to load points</p>
          <p className="mt-1">{pointsError.message}</p>
        </div>
      </div>
    )
  }

  // Show empty state if no balance data
  if (!balance) {
    return (
      <div className={`rounded-lg bg-white p-6 shadow ${className}`}>
        <p className="text-center text-gray-500">No points data available</p>
      </div>
    )
  }

  return (
    <div className={`rounded-lg bg-white p-6 shadow ${className}`}>
      {/* Points Balance */}
      <div className="mb-4">
        <p className="text-sm text-gray-600">Available Points</p>
        <p className="text-3xl font-bold text-gray-900">{balance.available.toLocaleString()}</p>
        {balance.frozen > 0 && (
          <p className="mt-1 text-xs text-gray-500">
            {balance.frozen.toLocaleString()} points frozen
          </p>
        )}
      </div>

      {/* Member Level */}
      {showLevel && (
        <div className="mb-4 rounded-md bg-gradient-to-r from-blue-50 to-purple-50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">Member Level</p>
              <p className="text-xl font-bold text-gray-900">{balance.level.name}</p>
            </div>
            <div className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-blue-600">
              {balance.level.level}
            </div>
          </div>
          {balance.levelExpireAt && (
            <p className="mt-2 text-xs text-gray-600">
              Expires: {new Date(balance.levelExpireAt).toLocaleDateString()}
            </p>
          )}
        </div>
      )}

      {/* Check-in Button */}
      {showCheckIn && (
        <div>
          {checkInError && (
            <div className="mb-3 rounded-md bg-red-50 p-3 text-sm text-red-800">
              {checkInError.message}
            </div>
          )}
          <button
            onClick={handleCheckIn}
            disabled={isCheckedIn || isCheckingIn}
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400 disabled:opacity-60"
          >
            {isCheckingIn ? (
              <span className="flex items-center justify-center">
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Checking in...
              </span>
            ) : isCheckedIn ? (
              'Checked In Today'
            ) : (
              'Daily Check-In'
            )}
          </button>
        </div>
      )}
    </div>
  )
}
