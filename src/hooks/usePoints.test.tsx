/**
 * usePoints Hook Tests
 */

import React from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { SWRConfig } from 'swr'
import { usePoints } from './usePoints'
import { getPointsAPI, resetPointsAPI } from '../api/points-api'
import { initSDKConfig, resetSDKConfig } from '../config/sdk-config'
import type { PointsBalance } from '../types/points'

// Mock the points API
vi.mock('../api/points-api', async () => {
  const actual = await vi.importActual('../api/points-api')
  return {
    ...actual,
    getPointsAPI: vi.fn(),
  }
})

describe('usePoints', () => {
  const mockBalance: PointsBalance = {
    available: 1000,
    frozen: 200,
    total: 1200,
    level: {
      level: 'VIP',
      name: 'VIP Member',
      benefits: ['10% bonus', 'Priority support'],
    },
    levelExpireAt: '2024-12-31T23:59:59Z',
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

  it('should fetch and return points balance', async () => {
    // Mock the getBalance method
    const mockGetBalance = vi.fn().mockResolvedValue(mockBalance)
    vi.mocked(getPointsAPI).mockReturnValue({
      getBalance: mockGetBalance,
    } as any)

    const { result } = renderHook(() => usePoints(), {
      wrapper: ({ children }) => (
        <SWRConfig value={{ provider: () => new Map() }}>{children}</SWRConfig>
      ),
    })

    // Initially loading
    expect(result.current.isLoading).toBe(true)
    expect(result.current.balance).toBeNull()
    expect(result.current.error).toBeNull()

    // Wait for data to load
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // Check loaded data
    expect(result.current.balance).toEqual(mockBalance)
    expect(result.current.error).toBeNull()
    expect(mockGetBalance).toHaveBeenCalledTimes(1)
  })

  it('should handle loading state correctly', async () => {
    const mockGetBalance = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve(mockBalance), 50)
        })
    )
    vi.mocked(getPointsAPI).mockReturnValue({
      getBalance: mockGetBalance,
    } as any)

    const { result } = renderHook(() => usePoints(), {
      wrapper: ({ children }) => (
        <SWRConfig value={{ provider: () => new Map() }}>{children}</SWRConfig>
      ),
    })

    // Should be loading initially
    expect(result.current.isLoading).toBe(true)
    expect(result.current.balance).toBeNull()

    // Wait for loading to complete
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.balance).toEqual(mockBalance)
  })

  it('should handle error state correctly', async () => {
    const mockError = new Error('Failed to fetch balance')
    const mockGetBalance = vi.fn().mockRejectedValue(mockError)
    vi.mocked(getPointsAPI).mockReturnValue({
      getBalance: mockGetBalance,
    } as any)

    const { result } = renderHook(() => usePoints(), {
      wrapper: ({ children }) => (
        <SWRConfig value={{ provider: () => new Map() }}>{children}</SWRConfig>
      ),
    })

    // Wait for error
    await waitFor(() => {
      expect(result.current.error).toBeTruthy()
    })

    expect(result.current.error?.message).toBe('Failed to fetch balance')
    expect(result.current.balance).toBeNull()
    expect(result.current.isLoading).toBe(false)
  })

  it('should refresh data when refresh is called', async () => {
    const updatedBalance: PointsBalance = {
      ...mockBalance,
      available: 1500,
      total: 1700,
    }

    const mockGetBalance = vi
      .fn()
      .mockResolvedValueOnce(mockBalance)
      .mockResolvedValueOnce(updatedBalance)

    vi.mocked(getPointsAPI).mockReturnValue({
      getBalance: mockGetBalance,
    } as any)

    const { result } = renderHook(() => usePoints(), {
      wrapper: ({ children }) => (
        <SWRConfig value={{ provider: () => new Map() }}>{children}</SWRConfig>
      ),
    })

    // Wait for initial data
    await waitFor(() => {
      expect(result.current.balance).toEqual(mockBalance)
    })

    // Call refresh
    await result.current.refresh()

    // Wait for updated data
    await waitFor(() => {
      expect(result.current.balance).toEqual(updatedBalance)
    })

    expect(mockGetBalance).toHaveBeenCalledTimes(2)
  })

  it('should return null balance when no data is available', () => {
    const mockGetBalance = vi.fn().mockImplementation(
      () => new Promise(() => {}) // Never resolves
    )
    vi.mocked(getPointsAPI).mockReturnValue({
      getBalance: mockGetBalance,
    } as any)

    const { result } = renderHook(() => usePoints(), {
      wrapper: ({ children }) => (
        <SWRConfig value={{ provider: () => new Map() }}>{children}</SWRConfig>
      ),
    })

    expect(result.current.balance).toBeNull()
    expect(result.current.isLoading).toBe(true)
  })

  it('should handle multiple refresh calls', async () => {
    const mockGetBalance = vi.fn().mockResolvedValue(mockBalance)
    vi.mocked(getPointsAPI).mockReturnValue({
      getBalance: mockGetBalance,
    } as any)

    const { result } = renderHook(() => usePoints(), {
      wrapper: ({ children }) => (
        <SWRConfig value={{ provider: () => new Map() }}>{children}</SWRConfig>
      ),
    })

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.balance).toEqual(mockBalance)
    })

    // Call refresh multiple times
    await result.current.refresh()
    await result.current.refresh()
    await result.current.refresh()

    // Should have called getBalance multiple times (initial + refreshes)
    expect(mockGetBalance).toHaveBeenCalled()
  })

  it('should handle API returning different balance values', async () => {
    const balances: PointsBalance[] = [
      mockBalance,
      { ...mockBalance, available: 500 },
      { ...mockBalance, available: 2000 },
    ]

    let callCount = 0
    const mockGetBalance = vi.fn().mockImplementation(() => {
      return Promise.resolve(balances[callCount++])
    })

    vi.mocked(getPointsAPI).mockReturnValue({
      getBalance: mockGetBalance,
    } as any)

    const { result } = renderHook(() => usePoints(), {
      wrapper: ({ children }) => (
        <SWRConfig value={{ provider: () => new Map() }}>{children}</SWRConfig>
      ),
    })

    // Wait for initial data
    await waitFor(() => {
      expect(result.current.balance?.available).toBe(1000)
    })

    // Refresh and check updated value
    await result.current.refresh()
    await waitFor(() => {
      expect(result.current.balance?.available).toBe(500)
    })

    // Refresh again
    await result.current.refresh()
    await waitFor(() => {
      expect(result.current.balance?.available).toBe(2000)
    })
  })
})
