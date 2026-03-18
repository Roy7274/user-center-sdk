/**
 * usePointsLedger Hook
 * 
 * React hook for managing paginated points ledger with infinite scroll support.
 * 
 * Features:
 * - Paginated data fetching
 * - Infinite scroll with loadMore
 * - Loading and error state management
 * - Manual refresh capability
 * - Automatic data accumulation
 * 
 * @module hooks/usePointsLedger
 */

import { useState, useCallback } from 'react'
import useSWR from 'swr'
import { getPointsAPI } from '../api/points-api'
import type { PointsLedgerEntry, PointsLedgerResponse } from '../types/points'

/**
 * Default page size for ledger queries
 */
const DEFAULT_PAGE_SIZE = 20

/**
 * usePointsLedger hook return type
 */
export interface UsePointsLedgerReturn {
  ledger: PointsLedgerEntry[]
  total: number
  page: number
  isLoading: boolean
  error: Error | null
  hasMore: boolean
  loadMore: () => Promise<void>
  refresh: () => Promise<void>
}

/**
 * Fetcher function for SWR
 */
async function fetchPointsLedger(
  page: number,
  pageSize: number
): Promise<PointsLedgerResponse> {
  const pointsAPI = getPointsAPI()
  return pointsAPI.getLedger({ page, pageSize })
}

/**
 * usePointsLedger - React hook for paginated points ledger management
 * 
 * Provides infinite scroll functionality by accumulating ledger entries
 * across multiple pages. The hook manages pagination state and provides
 * methods to load more entries and refresh the entire ledger.
 * 
 * @param initialPage - Initial page number (default: 1)
 * @param pageSize - Number of entries per page (default: 20)
 * @returns Object containing ledger data, pagination state, and control methods
 * 
 * @example
 * ```typescript
 * function PointsLedgerList() {
 *   const { ledger, isLoading, error, hasMore, loadMore, refresh } = usePointsLedger()
 * 
 *   if (isLoading && ledger.length === 0) return <div>Loading...</div>
 *   if (error) return <div>Error: {error.message}</div>
 * 
 *   return (
 *     <div>
 *       {ledger.map(entry => (
 *         <div key={entry.id}>
 *           {entry.description}: {entry.amount} points
 *         </div>
 *       ))}
 *       {hasMore && (
 *         <button onClick={loadMore} disabled={isLoading}>
 *           {isLoading ? 'Loading...' : 'Load More'}
 *         </button>
 *       )}
 *       <button onClick={refresh}>Refresh</button>
 *     </div>
 *   )
 * }
 * ```
 */
export function usePointsLedger(
  initialPage: number = 1,
  pageSize: number = DEFAULT_PAGE_SIZE
): UsePointsLedgerReturn {
  // Track current page for pagination
  const [currentPage, setCurrentPage] = useState(initialPage)
  
  // Track accumulated ledger entries across pages
  const [accumulatedLedger, setAccumulatedLedger] = useState<PointsLedgerEntry[]>([])
  
  // Track total count from API response
  const [totalCount, setTotalCount] = useState(0)

  // Generate SWR key based on current page and page size
  const swrKey = `/points/ledger?page=${currentPage}&pageSize=${pageSize}`

  // Fetch current page data
  const { error, isLoading, mutate } = useSWR<PointsLedgerResponse, Error>(
    swrKey,
    () => fetchPointsLedger(currentPage, pageSize),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,
      dedupingInterval: 2000,
      onSuccess: (response) => {
        // Update total count
        setTotalCount(response.total)
        
        // Accumulate entries if loading a new page
        if (currentPage === 1) {
          // Reset accumulated data on first page
          setAccumulatedLedger(response.items)
        } else {
          // Append new entries to accumulated data
          setAccumulatedLedger((prev) => {
            // Deduplicate by ID to avoid duplicates
            const existingIds = new Set(prev.map(entry => entry.id))
            const newEntries = response.items.filter(entry => !existingIds.has(entry.id))
            return [...prev, ...newEntries]
          })
        }
      }
    }
  )

  /**
   * Check if there are more pages to load
   */
  const hasMore = accumulatedLedger.length < totalCount

  /**
   * Load more entries (next page)
   * Increments the page counter to fetch the next page of data
   */
  const loadMore = useCallback(async (): Promise<void> => {
    if (!hasMore || isLoading) {
      return
    }
    
    setCurrentPage((prev) => prev + 1)
  }, [hasMore, isLoading])

  /**
   * Refresh ledger data
   * Resets to first page and clears accumulated data
   */
  const refresh = useCallback(async (): Promise<void> => {
    setCurrentPage(1)
    setAccumulatedLedger([])
    await mutate()
  }, [mutate])

  return {
    ledger: accumulatedLedger,
    total: totalCount,
    page: currentPage,
    isLoading,
    error: error ?? null,
    hasMore,
    loadMore,
    refresh,
  }
}
