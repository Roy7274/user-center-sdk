/**
 * useDeposit Hook
 * 
 * React hook for managing deposit/payment flow with wallet integration.
 * 
 * Features:
 * - Orchestrate complete deposit flow (connect, approve, pay, verify)
 * - Handle USDT approval flow automatically
 * - Track step state for UI progress indication
 * - Poll for benefit verification
 * - Handle errors (user rejection, insufficient balance, network errors)
 * 
 * @module hooks/useDeposit
 */

import { useState, useCallback } from 'react'
import { mutate } from 'swr'
import { parseUnits } from 'ethers'
import { useWeb3 } from '../components/Web3Provider'
import { getDepositAPI } from '../api/deposit-api'
import { getSDKConfig } from '../config/sdk-config'
import { BSC_CHAIN_CONFIG } from '../config/types'
import { 
  normalizeError
} from '../utils/error-handling'
import {
  approveUSDT,
  pay,
  waitForTransaction,
  hasSufficientUSDTAllowance,
} from '../deposit/contract'
import type {
  DepositRequest,
  DepositResult,
  DepositStep,
} from '../types/deposit'

/**
 * useDeposit hook return type
 */
export interface UseDepositReturn {
  deposit: (request: DepositRequest) => Promise<DepositResult>
  verifyDeposit: (
    txHash: string,
    userId: string
  ) => Promise<{
    verified: boolean
    processed: boolean
    benefitsGranted: boolean
    depositRecord?: unknown
  }>
  isLoading: boolean
  step: DepositStep
  error: Error | null
}

/**
 * useDeposit - React hook for deposit/payment management
 * 
 * Orchestrates the complete deposit flow:
 * 1. Connect wallet (if not connected)
 * 2. Switch to BSC network
 * 3. For USDT: approve contract to spend tokens (if needed)
 * 4. Execute payment transaction
 * 5. Save deposit record to backend
 * 6. Poll for verification until benefits are granted
 * 
 * @returns Object containing deposit method, verify method, loading state, step, and error
 * 
 * @example
 * ```typescript
 * function DepositButton() {
 *   const { deposit, isLoading, step, error } = useDeposit()
 * 
 *   const handleDeposit = async () => {
 *     try {
 *       const result = await deposit({
 *         tokenType: 'USDT',
 *         amount: '100',
 *         benefitType: 'points',
 *         benefitAmount: 1000
 *       })
 *       console.log('Deposit successful:', result.txHash)
 *     } catch (err) {
 *       console.error('Deposit failed:', err)
 *     }
 *   }
 * 
 *   return (
 *     <div>
 *       <button onClick={handleDeposit} disabled={isLoading}>
 *         {isLoading ? `${step}...` : 'Deposit'}
 *       </button>
 *       {error && <p>Error: {error.message}</p>}
 *     </div>
 *   )
 * }
 * ```
 */
export function useDeposit(): UseDepositReturn {
  const web3 = useWeb3()
  const [isLoading, setIsLoading] = useState(false)
  const [step, setStep] = useState<DepositStep>('idle')
  const [error, setError] = useState<Error | null>(null)

  /**
   * Verify deposit with polling
   * 
   * Polls the backend to check if the deposit has been confirmed and
   * benefits have been granted.
   * 
   * @param txHash - Transaction hash to verify
   * @returns Deposit record when verification is complete
   */
  const verifyDeposit = useCallback(
    async (
      txHash: string,
      userId: string,
    ): Promise<{
      verified: boolean
      processed: boolean
      benefitsGranted: boolean
      depositRecord?: unknown
    }> => {
    setIsLoading(true)
    setStep('verifying')
    setError(null)

    try {
      const depositAPI = getDepositAPI()
      const result = await depositAPI.verifyDepositWithPolling(txHash, userId, {
        interval: 3000,
        maxAttempts: 20,
      })

      setStep('idle')

      const recordStatus = result.record.status
      const processed = recordStatus !== 'pending'
      const verified = recordStatus === 'confirmed'

      return {
        verified,
        processed,
        benefitsGranted: result.benefitsGranted,
        depositRecord: result.record,
      }
    } catch (err) {
      const error = err as Error
      setError(error)
      setStep('idle')
      throw error
    } finally {
      setIsLoading(false)
    }
  },
  [],
)

  /**
   * Execute deposit flow
   * 
   * Orchestrates the complete deposit process from wallet connection
   * to benefit verification.
   * 
   * @param request - Deposit request with token type, amount, and benefit info
   * @returns Deposit result with transaction hash and status
   * @throws Error if any step fails
   */
  const deposit = useCallback(async (request: DepositRequest): Promise<DepositResult> => {
    setIsLoading(true)
    setError(null)

    try {
      // Step 1: Connect wallet if not connected
      setStep('connecting')
      if (!web3.isConnected) {
        await web3.connect()
      }

      if (!web3.signer || !web3.address) {
        throw new Error('Wallet not connected')
      }

      // Step 2: Switch to BSC network
      const sdkConfig = getSDKConfig()
      const targetChainId = BSC_CHAIN_CONFIG[sdkConfig.bscNetwork].chainId

      if (web3.chainId !== targetChainId) {
        await web3.switchNetwork(targetChainId)
      }

      // Step 3: For USDT, check and approve if needed
      if (request.tokenType === 'USDT') {
        const hasAllowance = await hasSufficientUSDTAllowance(
          web3.signer,
          web3.address,
          request.amount
        )

        if (!hasAllowance) {
          setStep('approving')
          const approveTx = await approveUSDT(web3.signer, request.amount)
          await waitForTransaction(approveTx)
        }
      }

      // Step 4: Execute payment transaction
      setStep('depositing')
      const paymentTx = await pay(web3.signer, request.tokenType, request.amount)
      const receipt = await waitForTransaction(paymentTx)

      // Step 5: Save deposit record to backend
      const depositAPI = getDepositAPI()
      try {
        const sdkConfig = getSDKConfig()
        const tokenAddress = request.tokenType === 'USDT' ? sdkConfig.usdtAddress : null

        const amountWei = parseUnits(request.amount, 18).toString()
        const walletAddress = web3.address
        const blockNumber = receipt.blockNumber ?? null

        // 获取区块时间戳（秒）
        let timestamp = Math.floor(Date.now() / 1000)
        try {
          const provider = web3.signer.provider
          if (provider && blockNumber != null) {
            const block = await provider.getBlock(blockNumber)
            if (block?.timestamp) timestamp = block.timestamp
          }
        } catch {
          // 回退到本地时间，保证请求可发起
        }

        const network = sdkConfig.bscNetwork === 'mainnet' ? 'BSC Mainnet' : 'BSC Testnet'
        const benefitExpireAt =
          request.benefitType === 'membership' && request.membershipDays
            ? timestamp + request.membershipDays * 24 * 60 * 60
            : null

        await depositAPI.saveDepositRecord({
          txHash: receipt.hash,
          userId: request.userId,
          tokenType: request.tokenType,
          amount: request.amount,
          tokenAddress,
          amountWei,
          walletAddress: walletAddress!,
          network,
          blockNumber,
          timestamp,
          benefitType: request.benefitType,
          benefitAmount: request.benefitType === 'points' ? request.benefitAmount : undefined,
          benefitLevel: request.benefitType === 'membership' ? request.membershipLevel : undefined,
          benefitExpireAt,
        })
      } catch (err) {
        // If record already exists (409), continue to verification
        const error = err as Error & { code?: string }
        if (error.code !== 'DEPOSIT_ALREADY_EXISTS') {
          throw err
        }
      }

      // Step 6: Poll for verification
      setStep('verifying')
      const verifyResult = await depositAPI.verifyDepositWithPolling(
        receipt.hash,
        request.userId,
        {
        interval: 3000,
        maxAttempts: 20,
        },
      )

      setStep('idle')

      const result: DepositResult = {
        txHash: receipt.hash,
        tokenType: request.tokenType,
        amount: request.amount,
        status: verifyResult.record.status,
        benefitsGranted: verifyResult.benefitsGranted,
      }

      // Refresh points balance after successful deposit
      if (verifyResult.benefitsGranted && request.benefitType === 'points') {
        try {
          await mutate('/points/balance')
        } catch (refreshError) {
          // Don't fail the deposit if points refresh fails
          console.warn('Failed to refresh points balance after deposit:', refreshError)
        }
      }

      return result
    } catch (err) {
      const error = err as Error

      // Reset step before handling error
      setStep('idle')

      // Normalize error to appropriate SDK error type
      const normalizedError = normalizeError(error)
      setError(normalizedError)
      throw normalizedError
    } finally {
      setIsLoading(false)
    }
  }, [web3])

  return {
    deposit,
    verifyDeposit,
    isLoading,
    step,
    error,
  }
}
