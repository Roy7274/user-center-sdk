/**
 * useDeposit Hook Tests
 */

import React from 'react'
import { renderHook, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useDeposit } from './useDeposit'
import { getDepositAPI, resetDepositAPI } from '../api/deposit-api'
import { initSDKConfig, resetSDKConfig } from '../config/sdk-config'
import * as contractUtils from '../deposit/contract'
import type { DepositRequest, DepositResult } from '../types/deposit'
import type { TransactionReceipt, TransactionResponse } from 'ethers'

// Mock the Web3Provider
const mockWeb3Context = {
  address: '0x1234567890123456789012345678901234567890',
  chainId: 97, // BSC Testnet
  isConnected: true,
  isConnecting: false,
  provider: {} as any,
  signer: {} as any,
  connect: vi.fn(),
  disconnect: vi.fn(),
  switchNetwork: vi.fn(),
  getBalance: vi.fn(),
}

vi.mock('../components/Web3Provider', () => ({
  useWeb3: () => mockWeb3Context,
}))

// Mock the deposit API
vi.mock('../api/deposit-api', async () => {
  const actual = await vi.importActual('../api/deposit-api')
  return {
    ...actual,
    getDepositAPI: vi.fn(),
  }
})

// Mock contract utilities
vi.mock('../deposit/contract', async () => {
  const actual = await vi.importActual('../deposit/contract')
  return {
    ...actual,
    approveUSDT: vi.fn(),
    pay: vi.fn(),
    waitForTransaction: vi.fn(),
    hasSufficientUSDTAllowance: vi.fn(),
  }
})

describe('useDeposit', () => {
  const mockTxHash = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
  
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
    // Initialize SDK config
    initSDKConfig({
      userCenterUrl: 'https://api.example.com',
      appId: 'test-app-id',
      bscNetwork: 'testnet',
      contractAddress: '0x1234567890123456789012345678901234567890',
      usdtAddress: '0x0987654321098765432109876543210987654321',
    })

    // Reset deposit API
    resetDepositAPI()

    // Reset mocks
    vi.clearAllMocks()

    // Reset web3 context to default
    mockWeb3Context.isConnected = true
    mockWeb3Context.chainId = 97
    mockWeb3Context.address = '0x1234567890123456789012345678901234567890'
    mockWeb3Context.signer = {} as any
  })

  afterEach(() => {
    resetSDKConfig()
    resetDepositAPI()
  })

  it('should initialize with correct default state', () => {
    const { result } = renderHook(() => useDeposit())

    expect(result.current.isLoading).toBe(false)
    expect(result.current.step).toBe('idle')
    expect(result.current.error).toBeNull()
    expect(typeof result.current.deposit).toBe('function')
    expect(typeof result.current.verifyDeposit).toBe('function')
  })

  it('should execute BNB deposit successfully', async () => {
    const mockSaveDepositRecord = vi.fn().mockResolvedValue({
      id: 'deposit-1',
      txHash: mockTxHash,
    })

    const mockVerifyDepositWithPolling = vi.fn().mockResolvedValue({
      record: {
        id: 'deposit-1',
        txHash: mockTxHash,
        status: 'confirmed',
      },
      benefitsGranted: true,
    })

    vi.mocked(getDepositAPI).mockReturnValue({
      saveDepositRecord: mockSaveDepositRecord,
      verifyDepositWithPolling: mockVerifyDepositWithPolling,
    } as any)

    vi.mocked(contractUtils.pay).mockResolvedValue(mockTxResponse)
    vi.mocked(contractUtils.waitForTransaction).mockResolvedValue(mockReceipt)

    const { result } = renderHook(() => useDeposit())

    const request: DepositRequest = {
      tokenType: 'BNB',
      amount: '0.1',
      benefitType: 'points',
      benefitAmount: 100,
    }

    let depositResult: DepositResult | undefined

    await act(async () => {
      depositResult = await result.current.deposit(request)
    })

    expect(depositResult).toEqual({
      txHash: mockTxHash,
      tokenType: 'BNB',
      amount: '0.1',
      status: 'confirmed',
      benefitsGranted: true,
    })

    expect(result.current.isLoading).toBe(false)
    expect(result.current.step).toBe('idle')
    expect(result.current.error).toBeNull()

    // Verify contract interactions
    expect(contractUtils.pay).toHaveBeenCalledWith(
      mockWeb3Context.signer,
      'BNB',
      '0.1'
    )
    expect(contractUtils.waitForTransaction).toHaveBeenCalledWith(mockTxResponse)

    // Verify API calls
    expect(mockSaveDepositRecord).toHaveBeenCalledWith({
      txHash: mockTxHash,
      tokenType: 'BNB',
      amount: '0.1',
      benefitType: 'points',
      benefitAmount: 100,
      membershipLevel: undefined,
      membershipDays: undefined,
    })

    expect(mockVerifyDepositWithPolling).toHaveBeenCalledWith(mockTxHash, {
      interval: 3000,
      maxAttempts: 20,
    })
  })

  it('should execute USDT deposit with approval', async () => {
    const mockSaveDepositRecord = vi.fn().mockResolvedValue({
      id: 'deposit-2',
      txHash: mockTxHash,
    })

    const mockVerifyDepositWithPolling = vi.fn().mockResolvedValue({
      record: {
        id: 'deposit-2',
        txHash: mockTxHash,
        status: 'confirmed',
      },
      benefitsGranted: true,
    })

    vi.mocked(getDepositAPI).mockReturnValue({
      saveDepositRecord: mockSaveDepositRecord,
      verifyDepositWithPolling: mockVerifyDepositWithPolling,
    } as any)

    // Mock insufficient allowance (needs approval)
    vi.mocked(contractUtils.hasSufficientUSDTAllowance).mockResolvedValue(false)
    vi.mocked(contractUtils.approveUSDT).mockResolvedValue(mockTxResponse)
    vi.mocked(contractUtils.pay).mockResolvedValue(mockTxResponse)
    vi.mocked(contractUtils.waitForTransaction).mockResolvedValue(mockReceipt)

    const { result } = renderHook(() => useDeposit())

    const request: DepositRequest = {
      tokenType: 'USDT',
      amount: '100',
      benefitType: 'points',
      benefitAmount: 1000,
    }

    let depositResult: DepositResult | undefined

    await act(async () => {
      depositResult = await result.current.deposit(request)
    })

    expect(depositResult).toEqual({
      txHash: mockTxHash,
      tokenType: 'USDT',
      amount: '100',
      status: 'confirmed',
      benefitsGranted: true,
    })

    // Verify approval flow
    expect(contractUtils.hasSufficientUSDTAllowance).toHaveBeenCalledWith(
      mockWeb3Context.signer,
      mockWeb3Context.address,
      '100'
    )
    expect(contractUtils.approveUSDT).toHaveBeenCalledWith(
      mockWeb3Context.signer,
      '100'
    )

    // Verify payment
    expect(contractUtils.pay).toHaveBeenCalledWith(
      mockWeb3Context.signer,
      'USDT',
      '100'
    )
  })

  it('should skip approval if USDT allowance is sufficient', async () => {
    const mockSaveDepositRecord = vi.fn().mockResolvedValue({
      id: 'deposit-3',
      txHash: mockTxHash,
    })

    const mockVerifyDepositWithPolling = vi.fn().mockResolvedValue({
      record: {
        id: 'deposit-3',
        txHash: mockTxHash,
        status: 'confirmed',
      },
      benefitsGranted: true,
    })

    vi.mocked(getDepositAPI).mockReturnValue({
      saveDepositRecord: mockSaveDepositRecord,
      verifyDepositWithPolling: mockVerifyDepositWithPolling,
    } as any)

    // Mock sufficient allowance (no approval needed)
    vi.mocked(contractUtils.hasSufficientUSDTAllowance).mockResolvedValue(true)
    vi.mocked(contractUtils.pay).mockResolvedValue(mockTxResponse)
    vi.mocked(contractUtils.waitForTransaction).mockResolvedValue(mockReceipt)

    const { result } = renderHook(() => useDeposit())

    const request: DepositRequest = {
      tokenType: 'USDT',
      amount: '100',
      benefitType: 'points',
      benefitAmount: 1000,
    }

    await act(async () => {
      await result.current.deposit(request)
    })

    // Verify approval was NOT called
    expect(contractUtils.approveUSDT).not.toHaveBeenCalled()

    // Verify payment was called
    expect(contractUtils.pay).toHaveBeenCalled()
  })

  it('should connect wallet if not connected', async () => {
    mockWeb3Context.isConnected = false
    mockWeb3Context.connect = vi.fn().mockImplementation(async () => {
      mockWeb3Context.isConnected = true
      mockWeb3Context.signer = {} as any
      mockWeb3Context.address = '0x1234567890123456789012345678901234567890'
    })

    const mockSaveDepositRecord = vi.fn().mockResolvedValue({})
    const mockVerifyDepositWithPolling = vi.fn().mockResolvedValue({
      record: { status: 'confirmed' },
      benefitsGranted: true,
    })

    vi.mocked(getDepositAPI).mockReturnValue({
      saveDepositRecord: mockSaveDepositRecord,
      verifyDepositWithPolling: mockVerifyDepositWithPolling,
    } as any)

    vi.mocked(contractUtils.pay).mockResolvedValue(mockTxResponse)
    vi.mocked(contractUtils.waitForTransaction).mockResolvedValue(mockReceipt)

    const { result } = renderHook(() => useDeposit())

    const request: DepositRequest = {
      tokenType: 'BNB',
      amount: '0.1',
      benefitType: 'points',
      benefitAmount: 100,
    }

    await act(async () => {
      await result.current.deposit(request)
    })

    expect(mockWeb3Context.connect).toHaveBeenCalled()
  })

  it('should switch network if on wrong chain', async () => {
    mockWeb3Context.chainId = 1 // Ethereum mainnet
    mockWeb3Context.switchNetwork = vi.fn().mockImplementation(async (chainId) => {
      mockWeb3Context.chainId = chainId
    })

    const mockSaveDepositRecord = vi.fn().mockResolvedValue({})
    const mockVerifyDepositWithPolling = vi.fn().mockResolvedValue({
      record: { status: 'confirmed' },
      benefitsGranted: true,
    })

    vi.mocked(getDepositAPI).mockReturnValue({
      saveDepositRecord: mockSaveDepositRecord,
      verifyDepositWithPolling: mockVerifyDepositWithPolling,
    } as any)

    vi.mocked(contractUtils.pay).mockResolvedValue(mockTxResponse)
    vi.mocked(contractUtils.waitForTransaction).mockResolvedValue(mockReceipt)

    const { result } = renderHook(() => useDeposit())

    const request: DepositRequest = {
      tokenType: 'BNB',
      amount: '0.1',
      benefitType: 'points',
      benefitAmount: 100,
    }

    await act(async () => {
      await result.current.deposit(request)
    })

    expect(mockWeb3Context.switchNetwork).toHaveBeenCalledWith(97) // BSC Testnet
  })

  it('should handle user rejection error', async () => {
    const userRejectionError = new Error('user rejected transaction')
    vi.mocked(contractUtils.pay).mockRejectedValue(userRejectionError)

    const { result } = renderHook(() => useDeposit())

    const request: DepositRequest = {
      tokenType: 'BNB',
      amount: '0.1',
      benefitType: 'points',
      benefitAmount: 100,
    }

    let caughtError: any

    await act(async () => {
      try {
        await result.current.deposit(request)
      } catch (err: any) {
        caughtError = err
      }
    })

    expect(caughtError.message).toBe('User rejected the transaction')
    expect(caughtError.name).toBe('UserRejectionError')
    expect(result.current.error?.name).toBe('UserRejectionError')
    expect(result.current.isLoading).toBe(false)
    expect(result.current.step).toBe('idle')
  })

  it('should handle insufficient balance error', async () => {
    const insufficientFundsError = new Error('insufficient funds for gas')
    vi.mocked(contractUtils.pay).mockRejectedValue(insufficientFundsError)

    const { result } = renderHook(() => useDeposit())

    const request: DepositRequest = {
      tokenType: 'BNB',
      amount: '0.1',
      benefitType: 'points',
      benefitAmount: 100,
    }

    await act(async () => {
      try {
        await result.current.deposit(request)
      } catch (err: any) {
        expect(err.message).toBe('Insufficient balance')
        expect(err.name).toBe('InsufficientBalanceError')
      }
    })

    expect(result.current.error?.name).toBe('InsufficientBalanceError')
  })

  it('should handle deposit record already exists (409)', async () => {
    const alreadyExistsError = new Error('Deposit already exists')
    ;(alreadyExistsError as any).code = 'DEPOSIT_ALREADY_EXISTS'

    const mockSaveDepositRecord = vi.fn().mockRejectedValue(alreadyExistsError)
    const mockVerifyDepositWithPolling = vi.fn().mockResolvedValue({
      record: { status: 'confirmed' },
      benefitsGranted: true,
    })

    vi.mocked(getDepositAPI).mockReturnValue({
      saveDepositRecord: mockSaveDepositRecord,
      verifyDepositWithPolling: mockVerifyDepositWithPolling,
    } as any)

    vi.mocked(contractUtils.pay).mockResolvedValue(mockTxResponse)
    vi.mocked(contractUtils.waitForTransaction).mockResolvedValue(mockReceipt)

    const { result } = renderHook(() => useDeposit())

    const request: DepositRequest = {
      tokenType: 'BNB',
      amount: '0.1',
      benefitType: 'points',
      benefitAmount: 100,
    }

    let depositResult: DepositResult | undefined

    await act(async () => {
      depositResult = await result.current.deposit(request)
    })

    // Should continue to verification even if record already exists
    expect(depositResult?.benefitsGranted).toBe(true)
    expect(mockVerifyDepositWithPolling).toHaveBeenCalled()
  })

  it('should handle verification timeout', async () => {
    const timeoutError = new Error('Verification timeout')
    ;(timeoutError as any).code = 'VERIFICATION_TIMEOUT'

    const mockSaveDepositRecord = vi.fn().mockResolvedValue({})
    const mockVerifyDepositWithPolling = vi.fn().mockRejectedValue(timeoutError)

    vi.mocked(getDepositAPI).mockReturnValue({
      saveDepositRecord: mockSaveDepositRecord,
      verifyDepositWithPolling: mockVerifyDepositWithPolling,
    } as any)

    vi.mocked(contractUtils.pay).mockResolvedValue(mockTxResponse)
    vi.mocked(contractUtils.waitForTransaction).mockResolvedValue(mockReceipt)

    const { result } = renderHook(() => useDeposit())

    const request: DepositRequest = {
      tokenType: 'BNB',
      amount: '0.1',
      benefitType: 'points',
      benefitAmount: 100,
    }

    await act(async () => {
      try {
        await result.current.deposit(request)
      } catch (err) {
        expect(err).toBe(timeoutError)
      }
    })

    expect(result.current.error).toBe(timeoutError)
  })

  it('should handle wallet not connected error', async () => {
    mockWeb3Context.isConnected = false
    mockWeb3Context.signer = null
    mockWeb3Context.address = null
    mockWeb3Context.connect = vi.fn().mockImplementation(async () => {
      // Simulate connection failure - signer still null
      mockWeb3Context.isConnected = true
    })

    const { result } = renderHook(() => useDeposit())

    const request: DepositRequest = {
      tokenType: 'BNB',
      amount: '0.1',
      benefitType: 'points',
      benefitAmount: 100,
    }

    await act(async () => {
      try {
        await result.current.deposit(request)
      } catch (err: any) {
        expect(err.message).toBe('Wallet not connected')
      }
    })

    expect(result.current.error?.message).toBe('Wallet not connected')
  })

  it('should verify deposit independently', async () => {
    const mockVerifyDepositWithPolling = vi.fn().mockResolvedValue({
      record: {
        id: 'deposit-1',
        txHash: mockTxHash,
        status: 'confirmed',
      },
      benefitsGranted: true,
    })

    vi.mocked(getDepositAPI).mockReturnValue({
      verifyDepositWithPolling: mockVerifyDepositWithPolling,
    } as any)

    const { result } = renderHook(() => useDeposit())

    let record

    await act(async () => {
      record = await result.current.verifyDeposit(mockTxHash)
    })

    expect(record).toEqual({
      id: 'deposit-1',
      txHash: mockTxHash,
      status: 'confirmed',
    })

    expect(mockVerifyDepositWithPolling).toHaveBeenCalledWith(mockTxHash, {
      interval: 3000,
      maxAttempts: 20,
    })
  })

  it('should handle membership deposit', async () => {
    const mockSaveDepositRecord = vi.fn().mockResolvedValue({})
    const mockVerifyDepositWithPolling = vi.fn().mockResolvedValue({
      record: { status: 'confirmed' },
      benefitsGranted: true,
    })

    vi.mocked(getDepositAPI).mockReturnValue({
      saveDepositRecord: mockSaveDepositRecord,
      verifyDepositWithPolling: mockVerifyDepositWithPolling,
    } as any)

    vi.mocked(contractUtils.pay).mockResolvedValue(mockTxResponse)
    vi.mocked(contractUtils.waitForTransaction).mockResolvedValue(mockReceipt)

    const { result } = renderHook(() => useDeposit())

    const request: DepositRequest = {
      tokenType: 'BNB',
      amount: '1.0',
      benefitType: 'membership',
      membershipLevel: 'VIP',
      membershipDays: 30,
    }

    await act(async () => {
      await result.current.deposit(request)
    })

    expect(mockSaveDepositRecord).toHaveBeenCalledWith({
      txHash: mockTxHash,
      tokenType: 'BNB',
      amount: '1.0',
      benefitType: 'membership',
      benefitAmount: undefined,
      membershipLevel: 'VIP',
      membershipDays: 30,
    })
  })

  it('should track step state during deposit flow', async () => {
    const mockSaveDepositRecord = vi.fn().mockResolvedValue({})
    const mockVerifyDepositWithPolling = vi.fn().mockResolvedValue({
      record: { status: 'confirmed' },
      benefitsGranted: true,
    })

    vi.mocked(getDepositAPI).mockReturnValue({
      saveDepositRecord: mockSaveDepositRecord,
      verifyDepositWithPolling: mockVerifyDepositWithPolling,
    } as any)

    vi.mocked(contractUtils.pay).mockResolvedValue(mockTxResponse)
    vi.mocked(contractUtils.waitForTransaction).mockResolvedValue(mockReceipt)

    const { result } = renderHook(() => useDeposit())

    const request: DepositRequest = {
      tokenType: 'BNB',
      amount: '0.1',
      benefitType: 'points',
      benefitAmount: 100,
    }

    // Execute deposit
    await act(async () => {
      await result.current.deposit(request)
    })

    // After completion, should be back to idle
    expect(result.current.step).toBe('idle')
    expect(result.current.isLoading).toBe(false)
  })
})
