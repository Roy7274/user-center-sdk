import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PointsDisplay } from './PointsDisplay'
import { usePoints } from '../hooks/usePoints'
import { useCheckIn } from '../hooks/useCheckIn'
import type { PointsBalance, CheckInResult } from '../types/points'

// Mock dependencies
vi.mock('../hooks/usePoints', () => ({
  usePoints: vi.fn(),
}))

vi.mock('../hooks/useCheckIn', () => ({
  useCheckIn: vi.fn(),
}))

describe('PointsDisplay', () => {
  const mockBalance: PointsBalance = {
    available: 1000,
    frozen: 50,
    total: 1050,
    level: {
      level: 'VIP',
      name: 'VIP Member',
      benefits: ['Benefit 1', 'Benefit 2'],
    },
    levelExpireAt: '2024-12-31T23:59:59Z',
  }

  const mockCheckIn = vi.fn()
  const mockRefresh = vi.fn()

  const defaultUsePoints = {
    balance: mockBalance,
    isLoading: false,
    error: null,
    refresh: mockRefresh,
  }

  const defaultUseCheckIn = {
    checkIn: mockCheckIn,
    isCheckedIn: false,
    isLoading: false,
    error: null,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(usePoints).mockReturnValue(defaultUsePoints)
    vi.mocked(useCheckIn).mockReturnValue(defaultUseCheckIn)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Rendering', () => {
    it('should render points balance', () => {
      render(<PointsDisplay />)

      expect(screen.getByText('Available Points')).toBeInTheDocument()
      expect(screen.getByText('1,000')).toBeInTheDocument()
    })

    it('should render frozen points when present', () => {
      render(<PointsDisplay />)

      expect(screen.getByText('50 points frozen')).toBeInTheDocument()
    })

    it('should not render frozen points when zero', () => {
      vi.mocked(usePoints).mockReturnValue({
        ...defaultUsePoints,
        balance: {
          ...mockBalance,
          frozen: 0,
        },
      })

      render(<PointsDisplay />)

      expect(screen.queryByText(/points frozen/)).not.toBeInTheDocument()
    })

    it('should render member level when showLevel is true', () => {
      render(<PointsDisplay showLevel={true} />)

      expect(screen.getByText('Member Level')).toBeInTheDocument()
      expect(screen.getByText('VIP Member')).toBeInTheDocument()
      expect(screen.getByText('VIP')).toBeInTheDocument()
    })

    it('should not render member level when showLevel is false', () => {
      render(<PointsDisplay showLevel={false} />)

      expect(screen.queryByText('Member Level')).not.toBeInTheDocument()
    })

    it('should render level expiration date', () => {
      render(<PointsDisplay />)

      expect(screen.getByText(/Expires:/)).toBeInTheDocument()
    })

    it('should not render expiration date when not present', () => {
      vi.mocked(usePoints).mockReturnValue({
        ...defaultUsePoints,
        balance: {
          ...mockBalance,
          levelExpireAt: undefined,
        },
      })

      render(<PointsDisplay />)

      expect(screen.queryByText(/Expires:/)).not.toBeInTheDocument()
    })

    it('should render check-in button when showCheckIn is true', () => {
      render(<PointsDisplay showCheckIn={true} />)

      expect(screen.getByText('Daily Check-In')).toBeInTheDocument()
    })

    it('should not render check-in button when showCheckIn is false', () => {
      render(<PointsDisplay showCheckIn={false} />)

      expect(screen.queryByText('Daily Check-In')).not.toBeInTheDocument()
    })

    it('should apply custom className', () => {
      const { container } = render(<PointsDisplay className="custom-class" />)

      const mainDiv = container.firstChild as HTMLElement
      expect(mainDiv.className).toContain('custom-class')
    })
  })

  describe('Loading state', () => {
    it('should show loading spinner when loading points', () => {
      vi.mocked(usePoints).mockReturnValue({
        ...defaultUsePoints,
        isLoading: true,
        balance: null,
      })

      render(<PointsDisplay />)

      expect(screen.getByText('Loading points...')).toBeInTheDocument()
    })

    it('should not show points data when loading', () => {
      vi.mocked(usePoints).mockReturnValue({
        ...defaultUsePoints,
        isLoading: true,
        balance: null,
      })

      render(<PointsDisplay />)

      expect(screen.queryByText('Available Points')).not.toBeInTheDocument()
    })
  })

  describe('Error state', () => {
    it('should show error message when points loading fails', () => {
      vi.mocked(usePoints).mockReturnValue({
        ...defaultUsePoints,
        balance: null,
        error: new Error('Failed to fetch points'),
      })

      render(<PointsDisplay />)

      expect(screen.getByText('Failed to load points')).toBeInTheDocument()
      expect(screen.getByText('Failed to fetch points')).toBeInTheDocument()
    })

    it('should not show points data when error occurs', () => {
      vi.mocked(usePoints).mockReturnValue({
        ...defaultUsePoints,
        balance: null,
        error: new Error('Failed to fetch points'),
      })

      render(<PointsDisplay />)

      expect(screen.queryByText('Available Points')).not.toBeInTheDocument()
    })

    it('should show check-in error when present', () => {
      vi.mocked(useCheckIn).mockReturnValue({
        ...defaultUseCheckIn,
        error: new Error('Check-in failed'),
      })

      render(<PointsDisplay />)

      expect(screen.getByText('Check-in failed')).toBeInTheDocument()
    })
  })

  describe('Empty state', () => {
    it('should show empty state when no balance data', () => {
      vi.mocked(usePoints).mockReturnValue({
        ...defaultUsePoints,
        balance: null,
      })

      render(<PointsDisplay />)

      expect(screen.getByText('No points data available')).toBeInTheDocument()
    })
  })

  describe('Check-in functionality', () => {
    it('should call checkIn when button is clicked', async () => {
      const mockResult: CheckInResult = {
        success: true,
        points: 10,
        consecutiveDays: 5,
        message: 'Check-in successful',
      }

      mockCheckIn.mockResolvedValue(mockResult)

      render(<PointsDisplay />)

      const checkInButton = screen.getByText('Daily Check-In')
      fireEvent.click(checkInButton)

      await waitFor(() => {
        expect(mockCheckIn).toHaveBeenCalledTimes(1)
      })
    })

    it('should call onCheckInSuccess when check-in succeeds', async () => {
      const mockResult: CheckInResult = {
        success: true,
        points: 10,
        consecutiveDays: 5,
        message: 'Check-in successful',
      }

      mockCheckIn.mockResolvedValue(mockResult)
      const onCheckInSuccess = vi.fn()

      render(<PointsDisplay onCheckInSuccess={onCheckInSuccess} />)

      const checkInButton = screen.getByText('Daily Check-In')
      fireEvent.click(checkInButton)

      await waitFor(() => {
        expect(onCheckInSuccess).toHaveBeenCalledWith(mockResult)
      })
    })

    it('should not call onCheckInSuccess when check-in fails', async () => {
      const mockResult: CheckInResult = {
        success: false,
        points: 0,
        consecutiveDays: 0,
        message: 'Already checked in',
      }

      mockCheckIn.mockResolvedValue(mockResult)
      const onCheckInSuccess = vi.fn()

      render(<PointsDisplay onCheckInSuccess={onCheckInSuccess} />)

      const checkInButton = screen.getByText('Daily Check-In')
      fireEvent.click(checkInButton)

      await waitFor(() => {
        expect(mockCheckIn).toHaveBeenCalled()
      })

      expect(onCheckInSuccess).not.toHaveBeenCalled()
    })

    it('should show "Checked In Today" when already checked in', () => {
      vi.mocked(useCheckIn).mockReturnValue({
        ...defaultUseCheckIn,
        isCheckedIn: true,
      })

      render(<PointsDisplay />)

      expect(screen.getByText('Checked In Today')).toBeInTheDocument()
    })

    it('should disable button when already checked in', () => {
      vi.mocked(useCheckIn).mockReturnValue({
        ...defaultUseCheckIn,
        isCheckedIn: true,
      })

      render(<PointsDisplay />)

      const checkInButton = screen.getByText('Checked In Today')
      expect(checkInButton).toBeDisabled()
    })

    it('should show loading state when checking in', () => {
      vi.mocked(useCheckIn).mockReturnValue({
        ...defaultUseCheckIn,
        isLoading: true,
      })

      render(<PointsDisplay />)

      expect(screen.getByText('Checking in...')).toBeInTheDocument()
    })

    it('should disable button when checking in', () => {
      vi.mocked(useCheckIn).mockReturnValue({
        ...defaultUseCheckIn,
        isLoading: true,
      })

      render(<PointsDisplay />)

      const checkInButton = screen.getByRole('button', { name: /checking in/i })
      expect(checkInButton).toBeDisabled()
    })

    it('should handle check-in error gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const error = new Error('Network error')
      mockCheckIn.mockRejectedValue(error)

      render(<PointsDisplay />)

      const checkInButton = screen.getByText('Daily Check-In')
      fireEvent.click(checkInButton)

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('Check-in failed:', error)
      })

      consoleErrorSpy.mockRestore()
    })
  })

  describe('Points formatting', () => {
    it('should format large numbers with commas', () => {
      vi.mocked(usePoints).mockReturnValue({
        ...defaultUsePoints,
        balance: {
          ...mockBalance,
          available: 1234567,
        },
      })

      render(<PointsDisplay />)

      expect(screen.getByText('1,234,567')).toBeInTheDocument()
    })

    it('should format frozen points with commas', () => {
      vi.mocked(usePoints).mockReturnValue({
        ...defaultUsePoints,
        balance: {
          ...mockBalance,
          frozen: 12345,
        },
      })

      render(<PointsDisplay />)

      expect(screen.getByText('12,345 points frozen')).toBeInTheDocument()
    })
  })

  describe('Member level display', () => {
    it('should display FREE level correctly', () => {
      vi.mocked(usePoints).mockReturnValue({
        ...defaultUsePoints,
        balance: {
          ...mockBalance,
          level: {
            level: 'FREE',
            name: 'Free Member',
            benefits: [],
          },
        },
      })

      render(<PointsDisplay />)

      expect(screen.getByText('Free Member')).toBeInTheDocument()
      expect(screen.getByText('FREE')).toBeInTheDocument()
    })

    it('should display SVIP level correctly', () => {
      vi.mocked(usePoints).mockReturnValue({
        ...defaultUsePoints,
        balance: {
          ...mockBalance,
          level: {
            level: 'SVIP',
            name: 'Super VIP',
            benefits: ['Premium benefit'],
          },
        },
      })

      render(<PointsDisplay />)

      expect(screen.getByText('Super VIP')).toBeInTheDocument()
      expect(screen.getByText('SVIP')).toBeInTheDocument()
    })
  })

  describe('Integration', () => {
    it('should work with all props enabled', () => {
      const onCheckInSuccess = vi.fn()

      render(
        <PointsDisplay
          showLevel={true}
          showCheckIn={true}
          onCheckInSuccess={onCheckInSuccess}
          className="test-class"
        />
      )

      expect(screen.getByText('Available Points')).toBeInTheDocument()
      expect(screen.getByText('Member Level')).toBeInTheDocument()
      expect(screen.getByText('Daily Check-In')).toBeInTheDocument()
    })

    it('should work with minimal props', () => {
      render(<PointsDisplay showLevel={false} showCheckIn={false} />)

      expect(screen.getByText('Available Points')).toBeInTheDocument()
      expect(screen.queryByText('Member Level')).not.toBeInTheDocument()
      expect(screen.queryByText('Daily Check-In')).not.toBeInTheDocument()
    })
  })
})
