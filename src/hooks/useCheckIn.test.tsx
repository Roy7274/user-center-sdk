/**
 * useCheckIn Hook Tests
 */

import React from 'react'
import { renderHook, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useCheckIn } from './useCheckIn'
import { getPointsAPI, resetPointsAPI } from '../api/points-api'
import { initSDKConfig, resetSDKConfig } from '../config/sdk-config'
import type { CheckInResult } from '../types/points'

// Mock the points API
vi.mock('../api/points-api', async () => {
  const actual = await vi.importActual('../api/points-api')
  return {
    ...actual,
    getPointsAPI: vi.fn(),
  }
})

describe('useCheckIn', () => {
  const mockCheckInResult: CheckInResult = {
    success: true,
    points: 10,
    consecutiveDays: 5,
    message: 'Check-in successful! Earned 10 points.',
  }

  beforeEach(() => {
    // Initialize SDK config
    initSDKConfig({
      userCenterUrl: 'https://api.example.com',
      appId: 'test-app-id',
      bscNetwork: 'testnet',
      contractAddress: '0x1234567890123456789012345678901234567890',
      usdtAddress: '0x0987654321098765432109876543210987654321',
    })

    // Reset points API
    resetPointsAPI()
  })

  afterEach(() => {
    resetSDKConfig()
    resetPointsAPI()
    vi.clearAllMocks()
  })

  it('should initialize with correct default state', () => {
    const mockCheckIn = vi.fn()
    vi.mocked(getPointsAPI).mockReturnValue({
      checkIn: mockCheckIn,
    } as any)

    const { result } = renderHook(() => useCheckIn())

    expect(result.current.isCheckedIn).toBe(false)
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
    expect(typeof result.current.checkIn).toBe('function')
  })

  it('should perform check-in successfully', async () => {
    const mockCheckIn = vi.fn().mockResolvedValue(mockCheckInResult)
    vi.mocked(getPointsAPI).mockReturnValue({
      checkIn: mockCheckIn,
    } as any)

    const { result } = renderHook(() => useCheckIn())

    let checkInResult: CheckInResult | undefined

    await act(async () => {
      checkInResult = await result.current.checkIn()
    })

    expect(checkInResult).toEqual(mockCheckInResult)
    expect(result.current.isCheckedIn).toBe(true)
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
    expect(mockCheckIn).toHaveBeenCalledTimes(1)
  })

  it('should handle loading state correctly', async () => {
    const mockCheckIn = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve(mockCheckInResult), 50)
        })
    )
    vi.mocked(getPointsAPI).mockReturnValue({
      checkIn: mockCheckIn,
    } as any)

    const { result } = renderHook(() => useCheckIn())

    // Start check-in and wait for completion
    await act(async () => {
      await result.current.checkIn()
    })

    expect(result.current.isLoading).toBe(false)
    expect(result.current.isCheckedIn).toBe(true)
  })

  it('should handle already checked in error (idempotency)', async () => {
    const alreadyCheckedInError = new Error('Already checked in today')
    ;(alreadyCheckedInError as any).code = 'ALREADY_CHECKED_IN'

    const mockCheckIn = vi.fn().mockRejectedValue(alreadyCheckedInError)
    vi.mocked(getPointsAPI).mockReturnValue({
      checkIn: mockCheckIn,
    } as any)

    const { result } = renderHook(() => useCheckIn())

    let checkInResult: CheckInResult | undefined

    await act(async () => {
      checkInResult = await result.current.checkIn()
    })

    // Should mark as checked in and return a result (not throw)
    expect(result.current.isCheckedIn).toBe(true)
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
    expect(checkInResult).toEqual({
      success: false,
      points: 0,
      consecutiveDays: 0,
      message: 'Already checked in today',
    })
  })

  it('should prevent multiple check-ins when already checked in', async () => {
    const mockCheckIn = vi.fn().mockResolvedValue(mockCheckInResult)
    vi.mocked(getPointsAPI).mockReturnValue({
      checkIn: mockCheckIn,
    } as any)

    const { result } = renderHook(() => useCheckIn())

    // First check-in
    await act(async () => {
      await result.current.checkIn()
    })

    expect(result.current.isCheckedIn).toBe(true)
    expect(mockCheckIn).toHaveBeenCalledTimes(1)

    // Second check-in attempt
    let secondResult: CheckInResult | undefined
    await act(async () => {
      secondResult = await result.current.checkIn()
    })

    // Should not call API again
    expect(mockCheckIn).toHaveBeenCalledTimes(1)
    expect(secondResult).toEqual({
      success: false,
      points: 0,
      consecutiveDays: 0,
      message: 'Already checked in today',
    })
  })

  it('should handle generic errors correctly', async () => {
    const mockError = new Error('Network error')
    const mockCheckIn = vi.fn().mockRejectedValue(mockError)
    vi.mocked(getPointsAPI).mockReturnValue({
      checkIn: mockCheckIn,
    } as any)

    const { result } = renderHook(() => useCheckIn())

    await act(async () => {
      try {
        await result.current.checkIn()
      } catch (err) {
        // Expected to throw
        expect(err).toBe(mockError)
      }
    })

    expect(result.current.isCheckedIn).toBe(false)
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBe(mockError)
  })

  it('should handle check-in with different consecutive days', async () => {
    const results: CheckInResult[] = [
      { success: true, points: 10, consecutiveDays: 1, message: 'Day 1' },
      { success: true, points: 10, consecutiveDays: 2, message: 'Day 2' },
      { success: true, points: 10, consecutiveDays: 3, message: 'Day 3' },
    ]

    let callCount = 0
    const mockCheckIn = vi.fn().mockImplementation(() => {
      return Promise.resolve(results[callCount++])
    })

    vi.mocked(getPointsAPI).mockReturnValue({
      checkIn: mockCheckIn,
    } as any)

    // First check-in
    const { result: result1 } = renderHook(() => useCheckIn())
    let checkInResult1: CheckInResult | undefined

    await act(async () => {
      checkInResult1 = await result1.current.checkIn()
    })

    expect(checkInResult1?.consecutiveDays).toBe(1)

    // Second check-in (new hook instance simulating next day)
    const { result: result2 } = renderHook(() => useCheckIn())
    let checkInResult2: CheckInResult | undefined

    await act(async () => {
      checkInResult2 = await result2.current.checkIn()
    })

    expect(checkInResult2?.consecutiveDays).toBe(2)
  })

  it('should clear error on successful check-in after previous error', async () => {
    const mockError = new Error('Network error')
    const mockCheckIn = vi
      .fn()
      .mockRejectedValueOnce(mockError)
      .mockResolvedValueOnce(mockCheckInResult)

    vi.mocked(getPointsAPI).mockReturnValue({
      checkIn: mockCheckIn,
    } as any)

    const { result } = renderHook(() => useCheckIn())

    // First attempt - should fail
    await act(async () => {
      try {
        await result.current.checkIn()
      } catch (err) {
        // Expected
      }
    })

    expect(result.current.error).toBe(mockError)
    expect(result.current.isCheckedIn).toBe(false)

    // Second attempt - should succeed
    // Note: In real scenario, this would be a new day, but for testing we simulate retry
    const { result: result2 } = renderHook(() => useCheckIn())

    await act(async () => {
      await result2.current.checkIn()
    })

    expect(result2.current.error).toBeNull()
    expect(result2.current.isCheckedIn).toBe(true)
  })

  it('should handle check-in with zero points', async () => {
    const zeroPointsResult: CheckInResult = {
      success: true,
      points: 0,
      consecutiveDays: 1,
      message: 'Check-in successful but no points earned',
    }

    const mockCheckIn = vi.fn().mockResolvedValue(zeroPointsResult)
    vi.mocked(getPointsAPI).mockReturnValue({
      checkIn: mockCheckIn,
    } as any)

    const { result } = renderHook(() => useCheckIn())

    let checkInResult: CheckInResult | undefined

    await act(async () => {
      checkInResult = await result.current.checkIn()
    })

    expect(checkInResult).toEqual(zeroPointsResult)
    expect(result.current.isCheckedIn).toBe(true)
  })

  it('should handle unsuccessful check-in result', async () => {
    const unsuccessfulResult: CheckInResult = {
      success: false,
      points: 0,
      consecutiveDays: 0,
      message: 'Check-in failed due to system error',
    }

    const mockCheckIn = vi.fn().mockResolvedValue(unsuccessfulResult)
    vi.mocked(getPointsAPI).mockReturnValue({
      checkIn: mockCheckIn,
    } as any)

    const { result } = renderHook(() => useCheckIn())

    let checkInResult: CheckInResult | undefined

    await act(async () => {
      checkInResult = await result.current.checkIn()
    })

    expect(checkInResult).toEqual(unsuccessfulResult)
    // Should not mark as checked in if success is false
    expect(result.current.isCheckedIn).toBe(false)
  })
})
