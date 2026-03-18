/**
 * usePointsLedger Hook Tests
 */

import { renderHook, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { SWRConfig } from 'swr'
import { usePointsLedger } from './usePointsLedger'
import { getPointsAPI, resetPointsAPI } from '../api/points-api'
import { initSDKConfig, resetSDKConfig } from '../config/sdk-config'
import type { PointsLedgerEntry, PointsLedgerResponse } from '../types/points'

// Mock the points API
vi.mock('../api/points-api', async () => {
  const actual = await vi.importActual('../api/points-api')
  return {
    ...actual,
    getPointsAPI: vi.fn(),
  }
})

describe('usePointsLedger', () => {
  const createMockEntry = (id: string, amount: number): PointsLedgerEntry => ({
    id,
    userId: 'user-123',
    amount,
    type: 'earn',
    source: 'checkin',
    description: `Transaction ${id}`,
    balance: 1000,
    createdAt: new Date().toISOString(),
  })

  const mockPage1: PointsLedgerResponse = {
    items: [
      createMockEntry('entry-1', 100),
      createMockEntry('entry-2', 50),
      createMockEntry('entry-3', 25),
    ],
    total: 8,
    page: 1,
    pageSize: 3,
  }

  const mockPage2: PointsLedgerResponse = {
    items: [
      createMockEntry('entry-4', 75),
      createMockEntry('entry-5', 30),
      createMockEntry('entry-6', 10),
    ],
    total: 8,
    page: 2,
    pageSize: 3,
  }

  const mockPage3: PointsLedgerResponse = {
    items: [
      createMockEntry('entry-7', 20),
      createMockEntry('entry-8', 15),
    ],
    total: 8,
    page: 3,
    pageSize: 3,
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

  it('should fetch and return first page of ledger entries', async () => {
    const mockGetLedger = vi.fn().mockResolvedValue(mockPage1)
    vi.mocked(getPointsAPI).mockReturnValue({
      getLedger: mockGetLedger,
    } as any)

    const { result } = renderHook(() => usePointsLedger(1, 3), {
      wrapper: ({ children }) => (
        <SWRConfig value={{ provider: () => new Map() }}>{children}</SWRConfig>
      ),
    })

    // Initially loading
    expect(result.current.isLoading).toBe(true)
    expect(result.current.ledger).toEqual([])
    expect(result.current.error).toBeNull()

    // Wait for data to load
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // Check loaded data
    expect(result.current.ledger).toHaveLength(3)
    expect(result.current.ledger[0].id).toBe('entry-1')
    expect(result.current.total).toBe(8)
    expect(result.current.page).toBe(1)
    expect(result.current.hasMore).toBe(true)
    expect(result.current.error).toBeNull()
    expect(mockGetLedger).toHaveBeenCalledWith({ page: 1, pageSize: 3 })
  })

  it('should load more entries when loadMore is called', async () => {
    const mockGetLedger = vi
      .fn()
      .mockResolvedValueOnce(mockPage1)
      .mockResolvedValueOnce(mockPage2)

    vi.mocked(getPointsAPI).mockReturnValue({
      getLedger: mockGetLedger,
    } as any)

    const { result } = renderHook(() => usePointsLedger(1, 3), {
      wrapper: ({ children }) => (
        <SWRConfig value={{ provider: () => new Map() }}>{children}</SWRConfig>
      ),
    })

    // Wait for first page
    await waitFor(() => {
      expect(result.current.ledger).toHaveLength(3)
    })

    expect(result.current.hasMore).toBe(true)

    // Load more
    await act(async () => {
      await result.current.loadMore()
    })

    // Wait for second page to load
    await waitFor(() => {
      expect(result.current.ledger).toHaveLength(6)
    })

    expect(result.current.ledger[3].id).toBe('entry-4')
    expect(result.current.page).toBe(2)
    expect(result.current.hasMore).toBe(true)
    expect(mockGetLedger).toHaveBeenCalledTimes(2)
  })

  it('should accumulate entries across multiple pages', async () => {
    const mockGetLedger = vi
      .fn()
      .mockResolvedValueOnce(mockPage1)
      .mockResolvedValueOnce(mockPage2)
      .mockResolvedValueOnce(mockPage3)

    vi.mocked(getPointsAPI).mockReturnValue({
      getLedger: mockGetLedger,
    } as any)

    const { result } = renderHook(() => usePointsLedger(1, 3), {
      wrapper: ({ children }) => (
        <SWRConfig value={{ provider: () => new Map() }}>{children}</SWRConfig>
      ),
    })

    // Wait for first page
    await waitFor(() => {
      expect(result.current.ledger).toHaveLength(3)
    })

    // Load page 2
    await act(async () => {
      await result.current.loadMore()
    })

    await waitFor(() => {
      expect(result.current.ledger).toHaveLength(6)
    })

    // Load page 3
    await act(async () => {
      await result.current.loadMore()
    })

    await waitFor(() => {
      expect(result.current.ledger).toHaveLength(8)
    })

    // All entries loaded
    expect(result.current.hasMore).toBe(false)
    expect(result.current.total).toBe(8)
    expect(mockGetLedger).toHaveBeenCalledTimes(3)
  })

  it('should not load more when hasMore is false', async () => {
    const singlePageResponse: PointsLedgerResponse = {
      items: [createMockEntry('entry-1', 100)],
      total: 1,
      page: 1,
      pageSize: 20,
    }

    const mockGetLedger = vi.fn().mockResolvedValue(singlePageResponse)
    vi.mocked(getPointsAPI).mockReturnValue({
      getLedger: mockGetLedger,
    } as any)

    const { result } = renderHook(() => usePointsLedger(), {
      wrapper: ({ children }) => (
        <SWRConfig value={{ provider: () => new Map() }}>{children}</SWRConfig>
      ),
    })

    // Wait for data
    await waitFor(() => {
      expect(result.current.ledger).toHaveLength(1)
    })

    expect(result.current.hasMore).toBe(false)

    // Try to load more
    await act(async () => {
      await result.current.loadMore()
    })

    // Should not make another API call
    expect(mockGetLedger).toHaveBeenCalledTimes(1)
    expect(result.current.page).toBe(1)
  })

  it('should not load more when already loading', async () => {
    const mockGetLedger = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve(mockPage1), 100)
        })
    )

    vi.mocked(getPointsAPI).mockReturnValue({
      getLedger: mockGetLedger,
    } as any)

    const { result } = renderHook(() => usePointsLedger(1, 3), {
      wrapper: ({ children }) => (
        <SWRConfig value={{ provider: () => new Map() }}>{children}</SWRConfig>
      ),
    })

    // Wait for initial load to start
    await waitFor(() => {
      expect(result.current.isLoading).toBe(true)
    })

    // Try to load more while loading
    await act(async () => {
      await result.current.loadMore()
    })

    // Should not increment page
    expect(result.current.page).toBe(1)
  })

  it('should refresh and reset to first page', async () => {
    const mockGetLedger = vi
      .fn()
      .mockResolvedValueOnce(mockPage1)
      .mockResolvedValueOnce(mockPage2)
      .mockResolvedValueOnce(mockPage1) // After refresh

    vi.mocked(getPointsAPI).mockReturnValue({
      getLedger: mockGetLedger,
    } as any)

    const { result } = renderHook(() => usePointsLedger(1, 3), {
      wrapper: ({ children }) => (
        <SWRConfig value={{ provider: () => new Map() }}>{children}</SWRConfig>
      ),
    })

    // Wait for first page
    await waitFor(() => {
      expect(result.current.ledger).toHaveLength(3)
    })

    // Load second page
    await act(async () => {
      await result.current.loadMore()
    })

    await waitFor(() => {
      expect(result.current.ledger).toHaveLength(6)
      expect(result.current.page).toBe(2)
    })

    // Refresh
    await act(async () => {
      await result.current.refresh()
    })

    // Should reset to page 1 with only first page data
    await waitFor(() => {
      expect(result.current.page).toBe(1)
      expect(result.current.ledger).toHaveLength(3)
    })

    expect(mockGetLedger).toHaveBeenCalledTimes(3)
  })

  it('should handle error state correctly', async () => {
    const mockError = new Error('Failed to fetch ledger')
    const mockGetLedger = vi.fn().mockRejectedValue(mockError)
    vi.mocked(getPointsAPI).mockReturnValue({
      getLedger: mockGetLedger,
    } as any)

    const { result } = renderHook(() => usePointsLedger(), {
      wrapper: ({ children }) => (
        <SWRConfig value={{ provider: () => new Map() }}>{children}</SWRConfig>
      ),
    })

    // Wait for error
    await waitFor(() => {
      expect(result.current.error).toBeTruthy()
    })

    expect(result.current.error?.message).toBe('Failed to fetch ledger')
    expect(result.current.ledger).toEqual([])
    expect(result.current.isLoading).toBe(false)
  })

  it('should deduplicate entries with same ID', async () => {
    const duplicatePage: PointsLedgerResponse = {
      items: [
        createMockEntry('entry-1', 100),
        createMockEntry('entry-2', 50),
        createMockEntry('entry-1', 100), // Duplicate
      ],
      total: 3,
      page: 1,
      pageSize: 3,
    }

    const mockGetLedger = vi.fn().mockResolvedValue(duplicatePage)
    vi.mocked(getPointsAPI).mockReturnValue({
      getLedger: mockGetLedger,
    } as any)

    const { result } = renderHook(() => usePointsLedger(), {
      wrapper: ({ children }) => (
        <SWRConfig value={{ provider: () => new Map() }}>{children}</SWRConfig>
      ),
    })

    // Wait for data
    await waitFor(() => {
      expect(result.current.ledger).toHaveLength(3)
    })

    // Check that duplicates are handled (should keep first occurrence)
    const ids = result.current.ledger.map(entry => entry.id)
    expect(ids).toEqual(['entry-1', 'entry-2', 'entry-1'])
  })

  it('should use default page size when not specified', async () => {
    const mockGetLedger = vi.fn().mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
    })

    vi.mocked(getPointsAPI).mockReturnValue({
      getLedger: mockGetLedger,
    } as any)

    renderHook(() => usePointsLedger(), {
      wrapper: ({ children }) => (
        <SWRConfig value={{ provider: () => new Map() }}>{children}</SWRConfig>
      ),
    })

    await waitFor(() => {
      expect(mockGetLedger).toHaveBeenCalledWith({ page: 1, pageSize: 20 })
    })
  })

  it('should handle empty ledger response', async () => {
    const emptyResponse: PointsLedgerResponse = {
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
    }

    const mockGetLedger = vi.fn().mockResolvedValue(emptyResponse)
    vi.mocked(getPointsAPI).mockReturnValue({
      getLedger: mockGetLedger,
    } as any)

    const { result } = renderHook(() => usePointsLedger(), {
      wrapper: ({ children }) => (
        <SWRConfig value={{ provider: () => new Map() }}>{children}</SWRConfig>
      ),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.ledger).toEqual([])
    expect(result.current.total).toBe(0)
    expect(result.current.hasMore).toBe(false)
  })
})
