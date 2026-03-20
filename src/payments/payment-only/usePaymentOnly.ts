import { useState, useCallback } from 'react'
import { parseUnits } from 'ethers'
import { useWeb3 } from '../../components/Web3Provider'
import { getDepositAPI } from '../../api/deposit-api'
import { getSDKConfig } from '../../config/sdk-config'
import { BSC_CHAIN_CONFIG } from '../../config/types'
import { normalizeError } from '../../utils/error-handling'
import {
  approveUSDT,
  pay,
  waitForTransaction,
  hasSufficientUSDTAllowance,
} from '../../deposit/contract'
import type { PaymentOnlyRequest, PaymentOnlyResult, PaymentOnlyStep } from './types'

export interface UsePaymentOnlyReturn {
  pay: (request: PaymentOnlyRequest) => Promise<PaymentOnlyResult>
  isLoading: boolean
  step: PaymentOnlyStep
  error: Error | null
}

export function usePaymentOnly(): UsePaymentOnlyReturn {
  const web3 = useWeb3()
  const [isLoading, setIsLoading] = useState(false)
  const [step, setStep] = useState<PaymentOnlyStep>('idle')
  const [error, setError] = useState<Error | null>(null)

  const payOnly = useCallback(
    async (request: PaymentOnlyRequest): Promise<PaymentOnlyResult> => {
      setIsLoading(true)
      setError(null)

      try {
        setStep('connecting')
        if (!web3.isConnected) {
          await web3.connect()
        }

        if (!web3.signer || !web3.address) {
          throw new Error('Wallet not connected')
        }

        const sdkConfig = getSDKConfig()
        const targetChainId = BSC_CHAIN_CONFIG[sdkConfig.bscNetwork].chainId

        if (web3.chainId !== targetChainId) {
          await web3.switchNetwork(targetChainId)
        }

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

        setStep('paying')
        const paymentTx = await pay(web3.signer, request.tokenType, request.amount)

        setStep('waiting_receipt')
        const receipt = await waitForTransaction(paymentTx)

        const depositAPI = getDepositAPI()
        const tokenAddress = request.tokenType === 'USDT' ? sdkConfig.usdtAddress : null
        const amountWei = parseUnits(request.amount, 18).toString()
        const walletAddress = web3.address
        const blockNumber = receipt.blockNumber ?? null

        let timestamp = Math.floor(Date.now() / 1000)
        try {
          const provider = web3.signer.provider
          if (provider && blockNumber != null) {
            const block = await provider.getBlock(blockNumber)
            if (block?.timestamp) timestamp = block.timestamp
          }
        } catch {
          // fall back to local time
        }

        const network = sdkConfig.bscNetwork === 'mainnet' ? 'BSC Mainnet' : 'BSC Testnet'

        setStep('saving_record')
        let backendRecordId: string | undefined
        let backendPayload: unknown

        try {
          const record = await depositAPI.savePaymentRecordOnly({
            userId: request.userId,
            txHash: receipt.hash,
            tokenType: request.tokenType,
            tokenAddress,
            amount: request.amount,
            amountWei,
            walletAddress: walletAddress!,
            network,
            blockNumber,
            timestamp,
            orderId: request.orderId,
            orderName: request.orderName,
            metadata: request.metadata,
          })
          backendRecordId = record.id
          backendPayload = record
        } catch (err) {
          const e = err as Error & { code?: string }
          if (e.code !== 'DEPOSIT_ALREADY_EXISTS') {
            throw err
          }
        }

        setStep('idle')

        return {
          txHash: receipt.hash,
          status: 'confirmed',
          tokenType: request.tokenType,
          amount: request.amount,
          backendRecordId,
          backendPayload,
        }
      } catch (err) {
        setStep('idle')
        const normalizedError = normalizeError(err as Error)
        setError(normalizedError)
        throw normalizedError
      } finally {
        setIsLoading(false)
      }
    },
    [web3]
  )

  return {
    pay: payOnly,
    isLoading,
    step,
    error,
  }
}
