import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PointsDetailsDialog } from './PointsDetailsDialog'
import { usePointsLedger } from '../hooks/usePointsLedger'
import type { PointsLedgerEntry } from '../types/points'

// Mock dependencies
vi.mock('../hooks/usePointsLedger', () => ({
  usePointsLedger: vi.fn(),
}))

describe('PointsDetailsDialog', () => {
  const mockOnOpenChange = vi.fn()
  const mockLoadMore = vi.fn()
  const mockRefresh = vi.fn()

  const mockLedgerEntry: PointsLedgerEntry = {
    id: '1',
    userId: 'user123',
    amount: 100,
    type: 'earn',
    source: 'checkin',
    description: 'Daily check-in reward',
    balance: 1000,
    createdAt: '2024-01-15T10:00:00Z',
  }

  const defaultUsePointsLedger = {
    ledger: [],
    total: 0,
    page: 1,
    isLoading: false,
    error: null,
    hasMore: false,
    loadMore: mockLoadMore,
    refresh: mockRefresh,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(usePointsLedger).mockReturnValue(defaultUsePointsLedger)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Rendering', () => {
    it('should not render when open is false', () => {
      render(
        <PointsDetailsDialog
          open={false}
          onOpenChange={mockOnOpenChange}
        />
      )

      expect(screen.queryByText('Points History')).not.toBeInTheDocument()
    })

    it('should render when open is true', () => {
      render(
        <PointsDetailsDialog
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      expect(screen.getByRole('heading', { name: 'Points History' })).toBeInTheDocument()
    })

    it('should render close button', () => {
      render(
        <PointsDetailsDialog
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      expect(screen.getByLabelText('Close')).toBeInTheDocument()
    })

    it('should render refresh button', () => {
      render(
        <PointsDetailsDialog
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      expect(screen.getByText('Refresh')).toBeInTheDocument()
    })
  })

  describe('Close functionality', () => {
    it('should call onOpenChange with false when close button is clicked', () => {
      render(
        <PointsDetailsDialog
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      const closeButton = screen.getByLabelText('Close')
      fireEvent.click(closeButton)

      expect(mockOnOpenChange).toHaveBeenCalledWith(false)
    })
  })

  describe('Loading state', () => {
    it('should show loading spinner when loading initial data', () => {
      vi.mocked(usePointsLedger).mockReturnValue({
        ...defaultUsePointsLedger,
        isLoading: true,
        ledger: [],
      })

      render(
        <PointsDetailsDialog
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      // Check for spinner (animated div with border)
      const spinner = document.querySelector('.animate-spin')
      expect(spinner).toBeInTheDocument()
    })

    it('should not show loading spinner when loading more data', () => {
      vi.mocked(usePointsLedger).mockReturnValue({
        ...defaultUsePointsLedger,
        isLoading: true,
        ledger: [mockLedgerEntry],
      })

      render(
        <PointsDetailsDialog
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      // Should show existing entries, not the initial loading spinner
      expect(screen.getByText('Daily check-in reward')).toBeInTheDocument()
    })
  })

  describe('Error state', () => {
    it('should display error message when error occurs', () => {
      const error = new Error('Failed to fetch ledger')
      vi.mocked(usePointsLedger).mockReturnValue({
        ...defaultUsePointsLedger,
        error,
      })

      render(
        <PointsDetailsDialog
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      expect(screen.getByText('Failed to load points history')).toBeInTheDocument()
      expect(screen.getByText('Failed to fetch ledger')).toBeInTheDocument()
    })

    it('should call refresh when try again button is clicked', () => {
      const error = new Error('Network error')
      vi.mocked(usePointsLedger).mockReturnValue({
        ...defaultUsePointsLedger,
        error,
      })

      render(
        <PointsDetailsDialog
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      const tryAgainButton = screen.getByText('Try again')
      fireEvent.click(tryAgainButton)

      expect(mockRefresh).toHaveBeenCalled()
    })
  })

  describe('Empty state', () => {
    it('should show empty state when no ledger entries', () => {
      render(
        <PointsDetailsDialog
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      expect(screen.getByText('No transactions yet')).toBeInTheDocument()
      expect(screen.getByText('Your points transaction history will appear here')).toBeInTheDocument()
    })

    it('should not show empty state when loading', () => {
      vi.mocked(usePointsLedger).mockReturnValue({
        ...defaultUsePointsLedger,
        isLoading: true,
      })

      render(
        <PointsDetailsDialog
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      expect(screen.queryByText('No transactions yet')).not.toBeInTheDocument()
    })

    it('should not show empty state when error occurs', () => {
      vi.mocked(usePointsLedger).mockReturnValue({
        ...defaultUsePointsLedger,
        error: new Error('Test error'),
      })

      render(
        <PointsDetailsDialog
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      expect(screen.queryByText('No transactions yet')).not.toBeInTheDocument()
    })
  })

  describe('Ledger entries display', () => {
    it('should display ledger entries', () => {
      const entries: PointsLedgerEntry[] = [
        {
          id: '1',
          userId: 'user123',
          amount: 100,
          type: 'earn',
          source: 'checkin',
          description: 'Daily check-in reward',
          balance: 1000,
          createdAt: '2024-01-15T10:00:00Z',
        },
        {
          id: '2',
          userId: 'user123',
          amount: -50,
          type: 'spend',
          source: 'consumption',
          description: 'API usage',
          balance: 950,
          createdAt: '2024-01-14T15:30:00Z',
        },
      ]

      vi.mocked(usePointsLedger).mockReturnValue({
        ...defaultUsePointsLedger,
        ledger: entries,
        total: 2,
      })

      render(
        <PointsDetailsDialog
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      expect(screen.getByText('Daily check-in reward')).toBeInTheDocument()
      expect(screen.getByText('API usage')).toBeInTheDocument()
    })

    it('should display transaction type correctly', () => {
      const entries: PointsLedgerEntry[] = [
        { ...mockLedgerEntry, id: '1', type: 'earn', description: 'Earned points' },
        { ...mockLedgerEntry, id: '2', type: 'spend', description: 'Spent points' },
        { ...mockLedgerEntry, id: '3', type: 'expire', description: 'Expired points' },
        { ...mockLedgerEntry, id: '4', type: 'refund', description: 'Refunded points' },
      ]

      vi.mocked(usePointsLedger).mockReturnValue({
        ...defaultUsePointsLedger,
        ledger: entries,
      })

      render(
        <PointsDetailsDialog
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      expect(screen.getByText('Earned')).toBeInTheDocument()
      expect(screen.getByText('Spent')).toBeInTheDocument()
      expect(screen.getByText('Expired')).toBeInTheDocument()
      expect(screen.getByText('Refunded')).toBeInTheDocument()
    })

    it('should display transaction source correctly', () => {
      const entries: PointsLedgerEntry[] = [
        { ...mockLedgerEntry, id: '1', source: 'checkin', description: 'Check-in reward' },
        { ...mockLedgerEntry, id: '2', source: 'deposit', description: 'Deposit reward' },
        { ...mockLedgerEntry, id: '3', source: 'membership', description: 'Membership reward' },
        { ...mockLedgerEntry, id: '4', source: 'promotion', description: 'Promotion reward' },
        { ...mockLedgerEntry, id: '5', source: 'consumption', description: 'Consumption usage' },
      ]

      vi.mocked(usePointsLedger).mockReturnValue({
        ...defaultUsePointsLedger,
        ledger: entries,
      })

      render(
        <PointsDetailsDialog
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      expect(screen.getByText('Daily Check-in')).toBeInTheDocument()
      expect(screen.getByText('Deposit')).toBeInTheDocument()
      expect(screen.getByText('Membership')).toBeInTheDocument()
      expect(screen.getByText('Promotion')).toBeInTheDocument()
      expect(screen.getByText('Consumption')).toBeInTheDocument()
    })

    it('should display positive amounts with + sign', () => {
      const entry: PointsLedgerEntry = {
        ...mockLedgerEntry,
        amount: 100,
      }

      vi.mocked(usePointsLedger).mockReturnValue({
        ...defaultUsePointsLedger,
        ledger: [entry],
      })

      render(
        <PointsDetailsDialog
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      expect(screen.getByText('+100')).toBeInTheDocument()
    })

    it('should display negative amounts without extra sign', () => {
      const entry: PointsLedgerEntry = {
        ...mockLedgerEntry,
        amount: -50,
      }

      vi.mocked(usePointsLedger).mockReturnValue({
        ...defaultUsePointsLedger,
        ledger: [entry],
      })

      render(
        <PointsDetailsDialog
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      expect(screen.getByText('-50')).toBeInTheDocument()
    })

    it('should display balance for each entry', () => {
      const entry: PointsLedgerEntry = {
        ...mockLedgerEntry,
        balance: 1500,
      }

      vi.mocked(usePointsLedger).mockReturnValue({
        ...defaultUsePointsLedger,
        ledger: [entry],
      })

      render(
        <PointsDetailsDialog
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      expect(screen.getByText('Balance: 1500')).toBeInTheDocument()
    })

    it('should display expiration date when present', () => {
      const entry: PointsLedgerEntry = {
        ...mockLedgerEntry,
        expireAt: '2024-12-31T23:59:59Z',
      }

      vi.mocked(usePointsLedger).mockReturnValue({
        ...defaultUsePointsLedger,
        ledger: [entry],
      })

      render(
        <PointsDetailsDialog
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      expect(screen.getByText(/Expires:/)).toBeInTheDocument()
    })

    it('should not display expiration date when not present', () => {
      const entry: PointsLedgerEntry = {
        ...mockLedgerEntry,
        expireAt: undefined,
      }

      vi.mocked(usePointsLedger).mockReturnValue({
        ...defaultUsePointsLedger,
        ledger: [entry],
      })

      render(
        <PointsDetailsDialog
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      expect(screen.queryByText(/Expires:/)).not.toBeInTheDocument()
    })

    it('should format dates correctly', () => {
      const entry: PointsLedgerEntry = {
        ...mockLedgerEntry,
        createdAt: '2024-01-15T10:30:00Z',
      }

      vi.mocked(usePointsLedger).mockReturnValue({
        ...defaultUsePointsLedger,
        ledger: [entry],
      })

      render(
        <PointsDetailsDialog
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      // Date formatting depends on locale, so just check that a date is displayed
      const dateElements = screen.getAllByText(/Jan|2024/)
      expect(dateElements.length).toBeGreaterThan(0)
    })
  })

  describe('Pagination', () => {
    it('should show load more button when hasMore is true', () => {
      vi.mocked(usePointsLedger).mockReturnValue({
        ...defaultUsePointsLedger,
        ledger: [mockLedgerEntry],
        hasMore: true,
      })

      render(
        <PointsDetailsDialog
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      expect(screen.getByText('Load More')).toBeInTheDocument()
    })

    it('should not show load more button when hasMore is false', () => {
      vi.mocked(usePointsLedger).mockReturnValue({
        ...defaultUsePointsLedger,
        ledger: [mockLedgerEntry],
        hasMore: false,
      })

      render(
        <PointsDetailsDialog
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      expect(screen.queryByText('Load More')).not.toBeInTheDocument()
    })

    it('should call loadMore when load more button is clicked', () => {
      vi.mocked(usePointsLedger).mockReturnValue({
        ...defaultUsePointsLedger,
        ledger: [mockLedgerEntry],
        hasMore: true,
      })

      render(
        <PointsDetailsDialog
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      const loadMoreButton = screen.getByText('Load More')
      fireEvent.click(loadMoreButton)

      expect(mockLoadMore).toHaveBeenCalled()
    })

    it('should disable load more button when loading', () => {
      vi.mocked(usePointsLedger).mockReturnValue({
        ...defaultUsePointsLedger,
        ledger: [mockLedgerEntry],
        hasMore: true,
        isLoading: true,
      })

      render(
        <PointsDetailsDialog
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      const loadMoreButton = screen.getByText('Loading...')
      expect(loadMoreButton).toBeDisabled()
    })

    it('should show loading text on load more button when loading', () => {
      vi.mocked(usePointsLedger).mockReturnValue({
        ...defaultUsePointsLedger,
        ledger: [mockLedgerEntry],
        hasMore: true,
        isLoading: true,
      })

      render(
        <PointsDetailsDialog
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      expect(screen.getByText('Loading...')).toBeInTheDocument()
    })
  })

  describe('Refresh functionality', () => {
    it('should call refresh when refresh button is clicked', () => {
      render(
        <PointsDetailsDialog
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      const refreshButton = screen.getByText('Refresh')
      fireEvent.click(refreshButton)

      expect(mockRefresh).toHaveBeenCalled()
    })

    it('should disable refresh button when loading', () => {
      vi.mocked(usePointsLedger).mockReturnValue({
        ...defaultUsePointsLedger,
        isLoading: true,
      })

      render(
        <PointsDetailsDialog
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      const refreshButton = screen.getByText('Refresh')
      expect(refreshButton).toBeDisabled()
    })
  })

  describe('Multiple entries', () => {
    it('should display multiple ledger entries in order', () => {
      const entries: PointsLedgerEntry[] = [
        {
          id: '1',
          userId: 'user123',
          amount: 100,
          type: 'earn',
          source: 'checkin',
          description: 'First entry',
          balance: 1000,
          createdAt: '2024-01-15T10:00:00Z',
        },
        {
          id: '2',
          userId: 'user123',
          amount: 50,
          type: 'earn',
          source: 'deposit',
          description: 'Second entry',
          balance: 1050,
          createdAt: '2024-01-16T10:00:00Z',
        },
        {
          id: '3',
          userId: 'user123',
          amount: -25,
          type: 'spend',
          source: 'consumption',
          description: 'Third entry',
          balance: 1025,
          createdAt: '2024-01-17T10:00:00Z',
        },
      ]

      vi.mocked(usePointsLedger).mockReturnValue({
        ...defaultUsePointsLedger,
        ledger: entries,
        total: 3,
      })

      render(
        <PointsDetailsDialog
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      expect(screen.getByText('First entry')).toBeInTheDocument()
      expect(screen.getByText('Second entry')).toBeInTheDocument()
      expect(screen.getByText('Third entry')).toBeInTheDocument()
    })

    it('should handle large number of entries', () => {
      const entries: PointsLedgerEntry[] = Array.from({ length: 50 }, (_, i) => ({
        id: `${i + 1}`,
        userId: 'user123',
        amount: 10,
        type: 'earn' as const,
        source: 'checkin' as const,
        description: `Entry ${i + 1}`,
        balance: 1000 + (i + 1) * 10,
        createdAt: '2024-01-15T10:00:00Z',
      }))

      vi.mocked(usePointsLedger).mockReturnValue({
        ...defaultUsePointsLedger,
        ledger: entries,
        total: 100,
        hasMore: true,
      })

      render(
        <PointsDetailsDialog
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      expect(screen.getByText('Entry 1')).toBeInTheDocument()
      expect(screen.getByText('Entry 50')).toBeInTheDocument()
    })
  })

  describe('Styling and colors', () => {
    it('should apply green color to positive amounts', () => {
      const entry: PointsLedgerEntry = {
        ...mockLedgerEntry,
        amount: 100,
      }

      vi.mocked(usePointsLedger).mockReturnValue({
        ...defaultUsePointsLedger,
        ledger: [entry],
      })

      const { container } = render(
        <PointsDetailsDialog
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      const amountElement = screen.getByText('+100')
      expect(amountElement.className).toContain('text-green-600')
    })

    it('should apply red color to negative amounts', () => {
      const entry: PointsLedgerEntry = {
        ...mockLedgerEntry,
        amount: -50,
      }

      vi.mocked(usePointsLedger).mockReturnValue({
        ...defaultUsePointsLedger,
        ledger: [entry],
      })

      const { container } = render(
        <PointsDetailsDialog
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      const amountElement = screen.getByText('-50')
      expect(amountElement.className).toContain('text-red-600')
    })

    it('should apply correct color to earn type', () => {
      const entry: PointsLedgerEntry = {
        ...mockLedgerEntry,
        type: 'earn',
      }

      vi.mocked(usePointsLedger).mockReturnValue({
        ...defaultUsePointsLedger,
        ledger: [entry],
      })

      render(
        <PointsDetailsDialog
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      const typeElement = screen.getByText('Earned')
      expect(typeElement.className).toContain('text-green-600')
    })

    it('should apply correct color to spend type', () => {
      const entry: PointsLedgerEntry = {
        ...mockLedgerEntry,
        type: 'spend',
      }

      vi.mocked(usePointsLedger).mockReturnValue({
        ...defaultUsePointsLedger,
        ledger: [entry],
      })

      render(
        <PointsDetailsDialog
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      const typeElement = screen.getByText('Spent')
      expect(typeElement.className).toContain('text-red-600')
    })
  })
})
