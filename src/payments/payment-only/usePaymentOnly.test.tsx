/**
 * usePaymentOnly Hook Tests
 */

import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { usePaymentOnly } from './usePaymentOnly'
import { getDepositAPI, resetDepositAPI } from '../../api/deposit-api'
import { initSDKConfig, resetSDKConfig } from '../../config/sdk-config'
import * as contractUtils from '../../deposit/contract'
import type { PaymentOnlyRequest, PaymentOnlyResult } from './types'
import type { TransactionReceipt, TransactionResponse } from 'ethers'

const mockWeb3Context = {
  address: '0x1234567890123456789012345678901234567890',
  chainId: 97,
  isConnected: true,
  isConnecting: false,
  provider: {} as any,
  signer: {} as any,
  connect: vi.fn(),
  disconnect: vi.fn(),
  switchNetwork: vi.fn(),
  getBalance: vi.fn(),
}

vi.mock('../../components/Web3Provider', () => ({
  useWeb3: () => mockWeb3Context,
}))

vi.mock('../../api/deposit-api', async () => {
  const actual = await vi.importActual('../../api/deposit-api')
  return {
    ...actual,
    getDepositAPI: vi.fn(),
  }
})

vi.mock('../../deposit/contract', async () => {
  const actual = await vi.importActual('../../deposit/contract')
  return {
    ...actual,
    approveUSDT: vi.fn(),
    pay: vi.fn(),
    waitForTransaction: vi.fn(),
    hasSufficientUSDTAllowance: vi.fn(),
  }
})

describe('usePaymentOnly', () => {
  const mockTxHash =
    '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'

  const mockReceipt: TransactionReceipt = {
    hash: mockTxHash,
    blockNumber: 12345,
    status: 1,
  } as any

  const mockTxResponse: TransactionResponse = {
    hash: mockTxHash,
    wait: vi.fn().mockResolvedValue(mockReceipt),
  } as any

  beforeEach(() => {
    initSDKConfig({
      userCenterUrl: 'https://api.example.com',
      appId: 'test-app-id',
      bscNetwork: 'testnet',
      contractAddress: '0x1234567890123456789012345678901234567890',
      usdtAddress: '0x0987654321098765432109876543210987654321',
    })
    resetDepositAPI()
    vi.clearAllMocks()
    mockWeb3Context.isConnected = true
    mockWeb3Context.chainId = 97
    mockWeb3Context.address = '0x1234567890123456789012345678901234567890'
    mockWeb3Context.signer = {} as any
  })

  afterEach(() => {
    resetSDKConfig()
    resetDepositAPI()
  })

  it('initializes with idle state', () => {
    const { result } = renderHook(() => usePaymentOnly())
    expect(result.current.isLoading).toBe(false)
    expect(result.current.step).toBe('idle')
    expect(result.current.error).toBeNull()
  })

  it('completes BNB payment and calls savePaymentRecordOnly without benefit fields', async () => {
    const mockSavePaymentRecordOnly = vi.fn().mockResolvedValue({
      id: 'pay-1',
      txHash: mockTxHash,
    })

    vi.mocked(getDepositAPI).mockReturnValue({
      savePaymentRecordOnly: mockSavePaymentRecordOnly,
    } as any)

    vi.mocked(contractUtils.pay).mockResolvedValue(mockTxResponse)
    vi.mocked(contractUtils.waitForTransaction).mockResolvedValue(mockReceipt)

    const { result } = renderHook(() => usePaymentOnly())

    const request: PaymentOnlyRequest = {
      userId: 'user-1',
      tokenType: 'BNB',
      amount: '0.1',
      orderId: 'ord-1',
      orderName: 'Test order',
    }

    let payResult: PaymentOnlyResult | undefined
    await act(async () => {
      payResult = await result.current.pay(request)
    })

    expect(payResult).toMatchObject({
      txHash: mockTxHash,
      status: 'confirmed',
      tokenType: 'BNB',
      amount: '0.1',
      backendRecordId: 'pay-1',
    })

    expect(mockSavePaymentRecordOnly).toHaveBeenCalledTimes(1)
    const call = mockSavePaymentRecordOnly.mock.calls[0][0]
    expect(call).toMatchObject({
      userId: 'user-1',
      txHash: mockTxHash,
      tokenType: 'BNB',
      amount: '0.1',
      orderId: 'ord-1',
      orderName: 'Test order',
    })
    expect(call).not.toHaveProperty('benefitType')
  })

  it('treats DEPOSIT_ALREADY_EXISTS as success after on-chain pay', async () => {
    const apiError = Object.assign(new Error('exists'), { code: 'DEPOSIT_ALREADY_EXISTS' })
    const mockSavePaymentRecordOnly = vi.fn().mockRejectedValue(apiError)

    vi.mocked(getDepositAPI).mockReturnValue({
      savePaymentRecordOnly: mockSavePaymentRecordOnly,
    } as any)

    vi.mocked(contractUtils.pay).mockResolvedValue(mockTxResponse)
    vi.mocked(contractUtils.waitForTransaction).mockResolvedValue(mockReceipt)

    const { result } = renderHook(() => usePaymentOnly())

    const request: PaymentOnlyRequest = {
      userId: 'user-1',
      tokenType: 'BNB',
      amount: '0.05',
      orderId: 'ord-2',
      orderName: 'Dup',
    }

    let payResult: PaymentOnlyResult | undefined
    await act(async () => {
      payResult = await result.current.pay(request)
    })

    expect(payResult).toMatchObject({
      txHash: mockTxHash,
      status: 'confirmed',
      backendRecordId: undefined,
    })
  })
})
