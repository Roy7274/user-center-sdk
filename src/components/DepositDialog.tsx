/**
 * DepositDialog Component
 * 
 * A comprehensive deposit/payment dialog that handles the complete on-chain
 * payment flow for BNB and USDT on BSC (Binance Smart Chain).
 * 
 * Features:
 * - Token type selection (BNB/USDT)
 * - Preset and custom amount input
 * - Automatic wallet connection and network switching
 * - USDT approval flow handling
 * - Transaction progress tracking
 * - Error handling with user-friendly messages
 * - Benefit verification polling
 * 
 * @module components/DepositDialog
 */

'use client'

import { useState, useCallback, useEffect } from 'react'
import { useDeposit } from '../hooks/useDeposit'
import type { DepositRequest, DepositResult, TokenType } from '../types/deposit'

/**
 * DepositDialog component props
 */
export interface DepositDialogProps {
  /** Whether the dialog is open */
  open: boolean
  /** Callback when dialog open state changes */
  onOpenChange: (open: boolean) => void
  /** Callback when deposit succeeds */
  onSuccess?: (result: DepositResult) => void
  /** Callback when deposit fails */
  onError?: (error: Error) => void
  /** Default token type to select */
  defaultTokenType?: TokenType
  /** Preset amount buttons to show */
  presetAmounts?: number[]

  /**
   * User Center 用户 ID（用于 /payment/deposit-record 与 /payment/verify/:txHash 校验）
   */
  userId: string
}

/**
 * DepositDialog - On-chain payment dialog
 * 
 * Provides a user-friendly interface for making deposits using BNB or USDT
 * on BSC. The component handles the complete flow from amount selection
 * to benefit verification.
 * 
 * The dialog shows:
 * - Token type selector (BNB/USDT)
 * - Preset amount buttons for quick selection
 * - Custom amount input field
 * - Transaction progress indicator
 * - Error messages and retry options
 * 
 * @param props - Component props
 * @returns JSX element
 * 
 * @example
 * ```typescript
 * function PaymentPage() {
 *   const [showDeposit, setShowDeposit] = useState(false)
 * 
 *   const handleDepositSuccess = (result: DepositResult) => {
 *     console.log('Deposit successful:', result.txHash)
 *     console.log('Benefits granted:', result.benefitsGranted)
 *     setShowDeposit(false)
 *   }
 * 
 *   const handleDepositError = (error: Error) => {
 *     console.error('Deposit failed:', error.message)
 *   }
 * 
 *   return (
 *     <div>
 *       <button onClick={() => setShowDeposit(true)}>
 *         Make Deposit
 *       </button>
 *       
 *       <DepositDialog
 *         open={showDeposit}
 *         onOpenChange={setShowDeposit}
 *         onSuccess={handleDepositSuccess}
 *         onError={handleDepositError}
 *         defaultTokenType="USDT"
 *         presetAmounts={[10, 50, 100, 500]}
 *       />
 *     </div>
 *   )
 * }
 * ```
 */
export function DepositDialog({
  open,
  onOpenChange,
  onSuccess,
  onError,
  defaultTokenType = 'USDT',
  presetAmounts = [10, 50, 100, 500],
  userId,
}: DepositDialogProps) {
  const { deposit, isLoading, step, error: depositError } = useDeposit()
  
  const [tokenType, setTokenType] = useState<TokenType>(defaultTokenType)
  const [amount, setAmount] = useState('')
  const [customAmount, setCustomAmount] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setAmount('')
      setCustomAmount('')
      setError(null)
    }
  }, [open])

  // Update error from deposit hook
  useEffect(() => {
    if (depositError) {
      setError(depositError.message)
    }
  }, [depositError])

  // Handle preset amount selection
  const handleAmountSelect = useCallback((value: number) => {
    setAmount(value.toString())
    setCustomAmount('')
    setError(null)
  }, [])

  // Handle custom amount input
  const handleCustomAmountChange = useCallback((value: string) => {
    // Only allow numbers and decimal point
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setCustomAmount(value)
      setAmount(value)
      setError(null)
    }
  }, [])

  // Handle token type toggle
  const handleTokenTypeChange = useCallback((type: TokenType) => {
    setTokenType(type)
    setError(null)
  }, [])

  // Handle deposit submission
  const handleDeposit = useCallback(async () => {
    setError(null)

    // Validate amount
    const amountValue = parseFloat(amount)
    if (!amount || isNaN(amountValue) || amountValue <= 0) {
      setError('Please enter a valid amount')
      return
    }

    try {
      const points = Math.max(1, Math.floor(amountValue * 10)) // user-center requires benefit_amount > 0
      const request: DepositRequest = {
        userId,
        tokenType,
        amount,
        benefitType: 'points',
        benefitAmount: points,
      }

      const result = await deposit(request)
      onSuccess?.(result)
      onOpenChange(false)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Deposit failed')
      setError(error.message)
      onError?.(error)
    }
  }, [amount, tokenType, deposit, onSuccess, onError, onOpenChange])

  // Get step display text
  const getStepText = () => {
    switch (step) {
      case 'connecting':
        return 'Connecting wallet...'
      case 'approving':
        return 'Approving USDT...'
      case 'depositing':
        return 'Processing payment...'
      case 'verifying':
        return 'Verifying transaction...'
      default:
        return 'Deposit'
    }
  }

  // Get step description
  const getStepDescription = () => {
    switch (step) {
      case 'connecting':
        return 'Please connect your wallet to continue'
      case 'approving':
        return 'Please approve the USDT spending in your wallet'
      case 'depositing':
        return 'Please confirm the payment transaction in your wallet'
      case 'verifying':
        return 'Waiting for transaction confirmation on the blockchain'
      default:
        return null
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        {/* Close button */}
        <button
          onClick={() => onOpenChange(false)}
          disabled={isLoading}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
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

        {/* Title */}
        <h2 className="mb-6 text-2xl font-bold text-gray-900">Deposit</h2>

        {/* Token type toggle */}
        <div className="mb-6">
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Select Token
          </label>
          <div className="flex space-x-2 rounded-lg bg-gray-100 p-1">
            <button
              onClick={() => handleTokenTypeChange('USDT')}
              disabled={isLoading}
              className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                tokenType === 'USDT'
                  ? 'bg-white text-gray-900 shadow'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              USDT
            </button>
            <button
              onClick={() => handleTokenTypeChange('BNB')}
              disabled={isLoading}
              className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                tokenType === 'BNB'
                  ? 'bg-white text-gray-900 shadow'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              BNB
            </button>
          </div>
        </div>

        {/* Preset amounts */}
        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Select Amount
          </label>
          <div className="grid grid-cols-4 gap-2">
            {presetAmounts.map((presetAmount) => (
              <button
                key={presetAmount}
                onClick={() => handleAmountSelect(presetAmount)}
                disabled={isLoading}
                className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                  amount === presetAmount.toString() && !customAmount
                    ? 'border-blue-600 bg-blue-50 text-blue-600'
                    : 'border-gray-300 text-gray-700 hover:border-gray-400'
                }`}
              >
                ${presetAmount}
              </button>
            ))}
          </div>
        </div>

        {/* Custom amount input */}
        <div className="mb-6">
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Or Enter Custom Amount
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
              $
            </span>
            <input
              type="text"
              value={customAmount}
              onChange={(e) => handleCustomAmountChange(e.target.value)}
              placeholder="0.00"
              disabled={isLoading}
              className="w-full rounded-md border border-gray-300 py-2 pl-7 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:opacity-50"
            />
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800">
            {error}
          </div>
        )}

        {/* Step progress */}
        {isLoading && step !== 'idle' && (
          <div className="mb-4 rounded-md bg-blue-50 p-3">
            <div className="flex items-center space-x-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
              <div>
                <p className="text-sm font-medium text-blue-900">{getStepText()}</p>
                {getStepDescription() && (
                  <p className="text-xs text-blue-700">{getStepDescription()}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Deposit button */}
        <button
          onClick={handleDeposit}
          disabled={isLoading || !amount}
          className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? getStepText() : `Deposit ${amount ? `$${amount}` : ''}`}
        </button>

        {/* Info text */}
        <p className="mt-4 text-center text-xs text-gray-500">
          You will receive {amount ? Math.max(1, Math.floor(parseFloat(amount) * 10)) : 0} points
        </p>
      </div>
    </div>
  )
}
