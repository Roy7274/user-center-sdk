'use client'

import { usePointsLedger } from '../hooks/usePointsLedger'
import type { PointsLedgerEntry } from '../types/points'

/**
 * PointsDetailsDialog props interface
 */
export interface PointsDetailsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Format date to readable string
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Get transaction type display text and color
 */
function getTransactionTypeStyle(type: PointsLedgerEntry['type']): {
  text: string
  color: string
} {
  switch (type) {
    case 'earn':
      return { text: 'Earned', color: 'text-green-600' }
    case 'spend':
      return { text: 'Spent', color: 'text-red-600' }
    case 'expire':
      return { text: 'Expired', color: 'text-gray-600' }
    case 'refund':
      return { text: 'Refunded', color: 'text-blue-600' }
    default:
      return { text: type, color: 'text-gray-600' }
  }
}

/**
 * Get transaction source display text
 */
function getSourceText(source: PointsLedgerEntry['source']): string {
  switch (source) {
    case 'checkin':
      return 'Daily Check-in'
    case 'deposit':
      return 'Deposit'
    case 'membership':
      return 'Membership'
    case 'promotion':
      return 'Promotion'
    case 'consumption':
      return 'Consumption'
    default:
      return source
  }
}

/**
 * PointsDetailsDialog component
 * Displays the user's points transaction history with pagination
 */
export function PointsDetailsDialog({
  open,
  onOpenChange,
}: PointsDetailsDialogProps) {
  const { ledger, isLoading, error, hasMore, loadMore, refresh } = usePointsLedger()

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative flex h-[600px] w-full max-w-2xl flex-col rounded-lg bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 p-6">
          <h2 className="text-2xl font-bold text-gray-900">Points History</h2>
          <button
            onClick={() => onOpenChange(false)}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Loading state (initial) */}
          {isLoading && ledger.length === 0 && (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-red-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    Failed to load points history
                  </h3>
                  <p className="mt-1 text-sm text-red-700">{error.message}</p>
                  <button
                    onClick={refresh}
                    className="mt-2 text-sm font-medium text-red-800 hover:text-red-900"
                  >
                    Try again
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Empty state */}
          {!isLoading && !error && ledger.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <svg
                className="h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No transactions yet</h3>
              <p className="mt-1 text-sm text-gray-500">
                Your points transaction history will appear here
              </p>
            </div>
          )}

          {/* Ledger entries */}
          {ledger.length > 0 && (
            <div className="space-y-4">
              {ledger.map((entry) => {
                const typeStyle = getTransactionTypeStyle(entry.type)
                const sourceText = getSourceText(entry.source)

                return (
                  <div
                    key={entry.id}
                    className="rounded-lg border border-gray-200 p-4 hover:bg-gray-50"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className={`text-sm font-medium ${typeStyle.color}`}>
                            {typeStyle.text}
                          </span>
                          <span className="text-sm text-gray-500">•</span>
                          <span className="text-sm text-gray-600">{sourceText}</span>
                        </div>
                        <p className="mt-1 text-sm text-gray-900">{entry.description}</p>
                        <p className="mt-1 text-xs text-gray-500">
                          {formatDate(entry.createdAt)}
                        </p>
                        {entry.expireAt && (
                          <p className="mt-1 text-xs text-orange-600">
                            Expires: {formatDate(entry.expireAt)}
                          </p>
                        )}
                      </div>
                      <div className="ml-4 text-right">
                        <p
                          className={`text-lg font-semibold ${
                            entry.amount >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {entry.amount >= 0 ? '+' : ''}
                          {entry.amount}
                        </p>
                        <p className="text-xs text-gray-500">Balance: {entry.balance}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Load more button */}
          {hasMore && (
            <div className="mt-6 flex justify-center">
              <button
                onClick={loadMore}
                disabled={isLoading}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4">
          <button
            onClick={refresh}
            disabled={isLoading}
            className="w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Refresh
          </button>
        </div>
      </div>
    </div>
  )
}
