import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { DepositDialog } from './DepositDialog'
import { useDeposit } from '../hooks/useDeposit'
import type { DepositResult } from '../types/deposit'

// Mock dependencies
vi.mock('../hooks/useDeposit', () => ({
  useDeposit: vi.fn(),
}))

describe('DepositDialog', () => {
  const mockOnOpenChange = vi.fn()
  const mockOnSuccess = vi.fn()
  const mockOnError = vi.fn()
  const mockDeposit = vi.fn()

  const defaultUseDeposit = {
    deposit: mockDeposit,
    verifyDeposit: vi.fn(),
    isLoading: false,
    step: 'idle' as const,
    error: null,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useDeposit).mockReturnValue(defaultUseDeposit)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Rendering', () => {
    it('should not render when open is false', () => {
      render(
        <DepositDialog
          open={false}
          onOpenChange={mockOnOpenChange}
        />
      )

      expect(screen.queryByText('Deposit')).not.toBeInTheDocument()
    })

    it('should render when open is true', () => {
      render(
        <DepositDialog
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      expect(screen.getByRole('heading', { name: 'Deposit' })).toBeInTheDocument()
    })

    it('should render token type toggle with USDT selected by default', () => {
      render(
        <DepositDialog
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      const usdtButton = screen.getByText('USDT')
      const bnbButton = screen.getByText('BNB')

      expect(usdtButton).toBeInTheDocument()
      expect(bnbButton).toBeInTheDocument()
      expect(usdtButton.className).toContain('bg-white')
    })

    it('should render with BNB selected when defaultTokenType is BNB', () => {
      render(
        <DepositDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          defaultTokenType="BNB"
        />
      )

      const bnbButton = screen.getByText('BNB')
      expect(bnbButton.className).toContain('bg-white')
    })

    it('should render preset amounts', () => {
      render(
        <DepositDialog
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      expect(screen.getByText('$10')).toBeInTheDocument()
      expect(screen.getByText('$50')).toBeInTheDocument()
      expect(screen.getByText('$100')).toBeInTheDocument()
      expect(screen.getByText('$500')).toBeInTheDocument()
    })

    it('should render custom preset amounts', () => {
      render(
        <DepositDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          presetAmounts={[20, 100, 200]}
        />
      )

      expect(screen.getByText('$20')).toBeInTheDocument()
      expect(screen.getByText('$100')).toBeInTheDocument()
      expect(screen.getByText('$200')).toBeInTheDocument()
      expect(screen.queryByText('$10')).not.toBeInTheDocument()
    })

    it('should render custom amount input', () => {
      render(
        <DepositDialog
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      expect(screen.getByPlaceholderText('0.00')).toBeInTheDocument()
    })
  })

  describe('Close functionality', () => {
    it('should call onOpenChange with false when close button is clicked', () => {
      render(
        <DepositDialog
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      const closeButton = screen.getByLabelText('Close')
      fireEvent.click(closeButton)

      expect(mockOnOpenChange).toHaveBeenCalledWith(false)
    })

    it('should disable close button when loading', () => {
      vi.mocked(useDeposit).mockReturnValue({
        ...defaultUseDeposit,
        isLoading: true,
        step: 'depositing',
      })

      render(
        <DepositDialog
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      const closeButton = screen.getByLabelText('Close')
      expect(closeButton).toBeDisabled()
    })
  })

  describe('Token type selection', () => {
    it('should switch to BNB when BNB button is clicked', () => {
      render(
        <DepositDialog
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      const bnbButton = screen.getByText('BNB')
      fireEvent.click(bnbButton)

      expect(bnbButton.className).toContain('bg-white')
    })

    it('should switch to USDT when USDT button is clicked', () => {
      render(
        <DepositDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          defaultTokenType="BNB"
        />
      )

      const usdtButton = screen.getByText('USDT')
      fireEvent.click(usdtButton)

      expect(usdtButton.className).toContain('bg-white')
    })

    it('should disable token type buttons when loading', () => {
      vi.mocked(useDeposit).mockReturnValue({
        ...defaultUseDeposit,
        isLoading: true,
        step: 'depositing',
      })

      render(
        <DepositDialog
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      const usdtButton = screen.getByText('USDT')
      const bnbButton = screen.getByText('BNB')

      expect(usdtButton).toBeDisabled()
      expect(bnbButton).toBeDisabled()
    })
  })

  describe('Amount selection', () => {
    it('should select preset amount when clicked', () => {
      render(
        <DepositDialog
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      const amount50Button = screen.getByText('$50')
      fireEvent.click(amount50Button)

      expect(amount50Button.className).toContain('border-blue-600')
    })

    it('should allow custom amount input', () => {
      render(
        <DepositDialog
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      const input = screen.getByPlaceholderText('0.00')
      fireEvent.change(input, { target: { value: '75.50' } })

      expect(input).toHaveValue('75.50')
    })

    it('should only allow numeric input with decimal', () => {
      render(
        <DepositDialog
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      const input = screen.getByPlaceholderText('0.00')
      
      // Valid input
      fireEvent.change(input, { target: { value: '123.45' } })
      expect(input).toHaveValue('123.45')

      // Invalid input (letters)
      fireEvent.change(input, { target: { value: 'abc' } })
      expect(input).toHaveValue('123.45') // Should not change
    })

    it('should clear custom amount when preset is selected', () => {
      render(
        <DepositDialog
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      const input = screen.getByPlaceholderText('0.00')
      fireEvent.change(input, { target: { value: '75' } })
      expect(input).toHaveValue('75')

      const amount50Button = screen.getByText('$50')
      fireEvent.click(amount50Button)

      expect(input).toHaveValue('')
    })

    it('should disable amount buttons when loading', () => {
      vi.mocked(useDeposit).mockReturnValue({
        ...defaultUseDeposit,
        isLoading: true,
        step: 'depositing',
      })

      render(
        <DepositDialog
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      const amount50Button = screen.getByText('$50')
      expect(amount50Button).toBeDisabled()
    })

    it('should disable custom amount input when loading', () => {
      vi.mocked(useDeposit).mockReturnValue({
        ...defaultUseDeposit,
        isLoading: true,
        step: 'depositing',
      })

      render(
        <DepositDialog
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      const input = screen.getByPlaceholderText('0.00')
      expect(input).toBeDisabled()
    })
  })

  describe('Deposit submission', () => {
    it('should call deposit with correct parameters for USDT', async () => {
      const mockResult: DepositResult = {
        txHash: '0x123',
        tokenType: 'USDT',
        amount: '100',
        status: 'confirmed',
        benefitsGranted: true,
      }

      mockDeposit.mockResolvedValue(mockResult)

      render(
        <DepositDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onSuccess={mockOnSuccess}
        />
      )

      // Select amount
      const amount100Button = screen.getByText('$100')
      fireEvent.click(amount100Button)

      // Click deposit
      const depositButton = screen.getByText('Deposit $100')
      fireEvent.click(depositButton)

      await waitFor(() => {
        expect(mockDeposit).toHaveBeenCalledWith({
          tokenType: 'USDT',
          amount: '100',
          benefitType: 'points',
          benefitAmount: 1000,
        })
      })

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledWith(mockResult)
        expect(mockOnOpenChange).toHaveBeenCalledWith(false)
      })
    })

    it('should call deposit with correct parameters for BNB', async () => {
      const mockResult: DepositResult = {
        txHash: '0x456',
        tokenType: 'BNB',
        amount: '50',
        status: 'confirmed',
        benefitsGranted: true,
      }

      mockDeposit.mockResolvedValue(mockResult)

      render(
        <DepositDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onSuccess={mockOnSuccess}
        />
      )

      // Switch to BNB
      const bnbButton = screen.getByText('BNB')
      fireEvent.click(bnbButton)

      // Select amount
      const amount50Button = screen.getByText('$50')
      fireEvent.click(amount50Button)

      // Click deposit
      const depositButton = screen.getByText('Deposit $50')
      fireEvent.click(depositButton)

      await waitFor(() => {
        expect(mockDeposit).toHaveBeenCalledWith({
          tokenType: 'BNB',
          amount: '50',
          benefitType: 'points',
          benefitAmount: 500,
        })
      })

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledWith(mockResult)
        expect(mockOnOpenChange).toHaveBeenCalledWith(false)
      })
    })

    it('should handle custom amount deposit', async () => {
      const mockResult: DepositResult = {
        txHash: '0x789',
        tokenType: 'USDT',
        amount: '75.50',
        status: 'confirmed',
        benefitsGranted: true,
      }

      mockDeposit.mockResolvedValue(mockResult)

      render(
        <DepositDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onSuccess={mockOnSuccess}
        />
      )

      // Enter custom amount
      const input = screen.getByPlaceholderText('0.00')
      fireEvent.change(input, { target: { value: '75.50' } })

      // Click deposit
      const depositButton = screen.getByText('Deposit $75.50')
      fireEvent.click(depositButton)

      await waitFor(() => {
        expect(mockDeposit).toHaveBeenCalledWith({
          tokenType: 'USDT',
          amount: '75.50',
          benefitType: 'points',
          benefitAmount: 755,
        })
      })
    })

    it('should show error when amount is not selected', () => {
      render(
        <DepositDialog
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      const depositButton = screen.getByRole('button', { name: /deposit/i })
      
      // Button should be disabled when no amount is selected
      expect(depositButton).toBeDisabled()
    })

    it('should show error when amount is zero', async () => {
      render(
        <DepositDialog
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      const input = screen.getByPlaceholderText('0.00')
      fireEvent.change(input, { target: { value: '0' } })

      const depositButton = screen.getByText('Deposit $0')
      fireEvent.click(depositButton)

      await waitFor(() => {
        expect(screen.getByText('Please enter a valid amount')).toBeInTheDocument()
      })

      expect(mockDeposit).not.toHaveBeenCalled()
    })

    it('should validate negative amounts through input restriction', () => {
      render(
        <DepositDialog
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      // The input validation prevents negative numbers
      const input = screen.getByPlaceholderText('0.00')
      fireEvent.change(input, { target: { value: '-10' } })

      // Input should not accept negative value due to regex validation
      expect(input).toHaveValue('')
    })

    it('should handle deposit error', async () => {
      const error = new Error('Insufficient balance')
      mockDeposit.mockRejectedValue(error)

      render(
        <DepositDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onError={mockOnError}
        />
      )

      // Select amount
      const amount50Button = screen.getByText('$50')
      fireEvent.click(amount50Button)

      // Click deposit
      const depositButton = screen.getByText('Deposit $50')
      fireEvent.click(depositButton)

      await waitFor(() => {
        expect(screen.getByText('Insufficient balance')).toBeInTheDocument()
      })

      expect(mockOnError).toHaveBeenCalledWith(error)
      expect(mockOnOpenChange).not.toHaveBeenCalled()
    })

    it('should disable deposit button when loading', () => {
      vi.mocked(useDeposit).mockReturnValue({
        ...defaultUseDeposit,
        isLoading: true,
        step: 'depositing',
      })

      render(
        <DepositDialog
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      // Select amount
      const amount50Button = screen.getByText('$50')
      fireEvent.click(amount50Button)

      const depositButton = screen.getByRole('button', { name: /processing payment/i })
      expect(depositButton).toBeDisabled()
    })

    it('should disable deposit button when no amount selected', () => {
      render(
        <DepositDialog
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      const depositButton = screen.getByRole('button', { name: /deposit/i })
      expect(depositButton).toBeDisabled()
    })
  })

  describe('Transaction progress', () => {
    it('should show connecting step', () => {
      vi.mocked(useDeposit).mockReturnValue({
        ...defaultUseDeposit,
        isLoading: true,
        step: 'connecting',
      })

      render(
        <DepositDialog
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      const progressTexts = screen.getAllByText('Connecting wallet...')
      expect(progressTexts.length).toBeGreaterThan(0)
      expect(screen.getByText('Please connect your wallet to continue')).toBeInTheDocument()
    })

    it('should show approving step for USDT', () => {
      vi.mocked(useDeposit).mockReturnValue({
        ...defaultUseDeposit,
        isLoading: true,
        step: 'approving',
      })

      render(
        <DepositDialog
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      const progressTexts = screen.getAllByText('Approving USDT...')
      expect(progressTexts.length).toBeGreaterThan(0)
      expect(screen.getByText('Please approve the USDT spending in your wallet')).toBeInTheDocument()
    })

    it('should show depositing step', () => {
      vi.mocked(useDeposit).mockReturnValue({
        ...defaultUseDeposit,
        isLoading: true,
        step: 'depositing',
      })

      render(
        <DepositDialog
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      const progressTexts = screen.getAllByText('Processing payment...')
      expect(progressTexts.length).toBeGreaterThan(0)
      expect(screen.getByText('Please confirm the payment transaction in your wallet')).toBeInTheDocument()
    })

    it('should show verifying step', () => {
      vi.mocked(useDeposit).mockReturnValue({
        ...defaultUseDeposit,
        isLoading: true,
        step: 'verifying',
      })

      render(
        <DepositDialog
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      const progressTexts = screen.getAllByText('Verifying transaction...')
      expect(progressTexts.length).toBeGreaterThan(0)
      expect(screen.getByText('Waiting for transaction confirmation on the blockchain')).toBeInTheDocument()
    })
  })

  describe('Points calculation', () => {
    it('should show correct points for preset amount', () => {
      render(
        <DepositDialog
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      const amount100Button = screen.getByText('$100')
      fireEvent.click(amount100Button)

      expect(screen.getByText('You will receive 1000 points')).toBeInTheDocument()
    })

    it('should show correct points for custom amount', () => {
      render(
        <DepositDialog
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      const input = screen.getByPlaceholderText('0.00')
      fireEvent.change(input, { target: { value: '75.50' } })

      expect(screen.getByText('You will receive 755 points')).toBeInTheDocument()
    })

    it('should show 0 points when no amount selected', () => {
      render(
        <DepositDialog
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      expect(screen.getByText('You will receive 0 points')).toBeInTheDocument()
    })
  })

  describe('Error handling', () => {
    it('should display error from deposit hook', () => {
      vi.mocked(useDeposit).mockReturnValue({
        ...defaultUseDeposit,
        error: new Error('User rejected transaction'),
      })

      render(
        <DepositDialog
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      expect(screen.getByText('User rejected transaction')).toBeInTheDocument()
    })

    it('should clear error when token type changes', () => {
      vi.mocked(useDeposit).mockReturnValue({
        ...defaultUseDeposit,
        error: new Error('Previous error'),
      })

      render(
        <DepositDialog
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      // Error should be displayed from hook
      expect(screen.getByText('Previous error')).toBeInTheDocument()

      // Change token type
      const bnbButton = screen.getByText('BNB')
      fireEvent.click(bnbButton)

      // Error should be cleared
      expect(screen.queryByText('Previous error')).not.toBeInTheDocument()
    })

    it('should clear error when amount changes', () => {
      vi.mocked(useDeposit).mockReturnValue({
        ...defaultUseDeposit,
        error: new Error('Previous error'),
      })

      render(
        <DepositDialog
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      // Error should be displayed from hook
      expect(screen.getByText('Previous error')).toBeInTheDocument()

      // Select amount
      const amount50Button = screen.getByText('$50')
      fireEvent.click(amount50Button)

      // Error should be cleared
      expect(screen.queryByText('Previous error')).not.toBeInTheDocument()
    })
  })

  describe('State reset', () => {
    it('should reset state when dialog opens', () => {
      const { rerender } = render(
        <DepositDialog
          open={false}
          onOpenChange={mockOnOpenChange}
        />
      )

      rerender(
        <DepositDialog
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      const input = screen.getByPlaceholderText('0.00')
      fireEvent.change(input, { target: { value: '100' } })

      expect(input).toHaveValue('100')

      // Close and reopen
      rerender(
        <DepositDialog
          open={false}
          onOpenChange={mockOnOpenChange}
        />
      )

      rerender(
        <DepositDialog
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      const newInput = screen.getByPlaceholderText('0.00')
      expect(newInput).toHaveValue('')
    })
  })
})
