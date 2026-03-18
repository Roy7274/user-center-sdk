/**
 * Tests for Deposit API
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  DepositAPI,
  createDepositAPI,
  getDepositAPI,
  resetDepositAPI,
  type SaveDepositRecordRequest,
  type VerifyDepositResponse,
} from './deposit-api'
import { resetAPIClient, APIClientError } from './api-client'
import { initSDKConfig, resetSDKConfig } from '../config/sdk-config'
import type { DepositRecord } from '../types/deposit'

// Mock fetch
global.fetch = vi.fn()

describe('DepositAPI', () => {
  beforeEach(() => {
    // Initialize SDK config
    initSDKConfig({
      userCenterUrl: 'https://api.example.com',
      appId: 'test-app-id',
      bscNetwork: 'testnet',
      contractAddress: '0x1234567890123456789012345678901234567890',
      usdtAddress: '0x0987654321098765432109876543210987654321',
    })

    // Reset mocks and singletons
    vi.clearAllMocks()
    resetAPIClient()
    resetDepositAPI()
  })

  afterEach(() => {
    resetSDKConfig()
  })

  describe('Constructor and Singleton', () => {
    it('should create DepositAPI instance', () => {
      const depositApi = new DepositAPI()
      expect(depositApi).toBeInstanceOf(DepositAPI)
    })

    it('should return same instance from getDepositAPI', () => {
      const api1 = getDepositAPI()
      const api2 = getDepositAPI()
      expect(api1).toBe(api2)
    })

    it('should create new instance after reset', () => {
      const api1 = getDepositAPI()
      resetDepositAPI()
      const api2 = getDepositAPI()
      expect(api1).not.toBe(api2)
    })

    it('should create new instance with createDepositAPI', () => {
      const api1 = createDepositAPI()
      const api2 = createDepositAPI()
      expect(api1).not.toBe(api2)
    })
  })

  describe('saveDepositRecord', () => {
    it('should successfully save deposit record for points', async () => {
      const request: SaveDepositRecordRequest = {
        txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        tokenType: 'USDT',
        amount: '100.00',
        benefitType: 'points',
        benefitAmount: 1000,
      }

      const mockResponse: DepositRecord = {
        id: 'deposit-1',
        userId: 'user-123',
        txHash: request.txHash,
        tokenType: 'USDT',
        amount: '100.00',
        usdAmount: 100,
        benefitType: 'points',
        benefitAmount: 1000,
        status: 'pending',
        createdAt: '2024-01-15T10:00:00Z',
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockResponse,
      })

      const depositApi = new DepositAPI()
      const result = await depositApi.saveDepositRecord(request)

      expect(result).toEqual(mockResponse)
      expect(result.txHash).toBe(request.txHash)
      expect(result.benefitType).toBe('points')
      expect(result.benefitAmount).toBe(1000)
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/deposit/save',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(request),
        })
      )
    })

    it('should successfully save deposit record for membership', async () => {
      const request: SaveDepositRecordRequest = {
        txHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        tokenType: 'BNB',
        amount: '0.5',
        benefitType: 'membership',
        membershipLevel: 'VIP',
        membershipDays: 30,
      }

      const mockResponse: DepositRecord = {
        id: 'deposit-2',
        userId: 'user-123',
        txHash: request.txHash,
        tokenType: 'BNB',
        amount: '0.5',
        usdAmount: 150,
        benefitType: 'membership',
        membershipLevel: 'VIP',
        status: 'pending',
        createdAt: '2024-01-15T10:00:00Z',
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockResponse,
      })

      const depositApi = new DepositAPI()
      const result = await depositApi.saveDepositRecord(request)

      expect(result).toEqual(mockResponse)
      expect(result.benefitType).toBe('membership')
      expect(result.membershipLevel).toBe('VIP')
    })

    it('should handle 409 conflict (deposit already exists)', async () => {
      const request: SaveDepositRecordRequest = {
        txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        tokenType: 'USDT',
        amount: '100.00',
        benefitType: 'points',
        benefitAmount: 1000,
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 409,
        statusText: 'Conflict',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          error: {
            code: 'CONFLICT',
            message: 'Deposit record already exists',
            details: { txHash: request.txHash },
          },
        }),
      })

      const depositApi = new DepositAPI()

      try {
        await depositApi.saveDepositRecord(request)
        // Should not reach here
        expect(true).toBe(false)
      } catch (error) {
        expect(error).toBeInstanceOf(APIClientError)
        expect((error as APIClientError).code).toBe('DEPOSIT_ALREADY_EXISTS')
        expect((error as APIClientError).statusCode).toBe(409)
      }
    })

    it('should handle unauthorized error', async () => {
      const request: SaveDepositRecordRequest = {
        txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        tokenType: 'USDT',
        amount: '100.00',
        benefitType: 'points',
        benefitAmount: 1000,
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        }),
      })

      const depositApi = new DepositAPI()

      await expect(depositApi.saveDepositRecord(request)).rejects.toThrow(
        'Authentication required'
      )
    })

    it('should handle validation error', async () => {
      const request: SaveDepositRecordRequest = {
        txHash: 'invalid-hash',
        tokenType: 'USDT',
        amount: '100.00',
        benefitType: 'points',
        benefitAmount: 1000,
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid transaction hash format',
          },
        }),
      })

      const depositApi = new DepositAPI()

      await expect(depositApi.saveDepositRecord(request)).rejects.toThrow(
        'Invalid transaction hash format'
      )
    })
  })

  describe('verifyDeposit', () => {
    it('should successfully verify deposit with benefits granted', async () => {
      const txHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'

      const mockResponse: VerifyDepositResponse = {
        record: {
          id: 'deposit-1',
          userId: 'user-123',
          txHash,
          tokenType: 'USDT',
          amount: '100.00',
          usdAmount: 100,
          benefitType: 'points',
          benefitAmount: 1000,
          status: 'confirmed',
          createdAt: '2024-01-15T10:00:00Z',
          confirmedAt: '2024-01-15T10:05:00Z',
        },
        benefitsGranted: true,
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockResponse,
      })

      const depositApi = new DepositAPI()
      const result = await depositApi.verifyDeposit(txHash)

      expect(result).toEqual(mockResponse)
      expect(result.benefitsGranted).toBe(true)
      expect(result.record.status).toBe('confirmed')
      expect(global.fetch).toHaveBeenCalledWith(
        `https://api.example.com/deposit/verify?txHash=${encodeURIComponent(txHash)}`,
        expect.objectContaining({
          method: 'GET',
        })
      )
    })

    it('should verify deposit with pending status', async () => {
      const txHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'

      const mockResponse: VerifyDepositResponse = {
        record: {
          id: 'deposit-1',
          userId: 'user-123',
          txHash,
          tokenType: 'USDT',
          amount: '100.00',
          usdAmount: 100,
          benefitType: 'points',
          benefitAmount: 1000,
          status: 'pending',
          createdAt: '2024-01-15T10:00:00Z',
        },
        benefitsGranted: false,
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockResponse,
      })

      const depositApi = new DepositAPI()
      const result = await depositApi.verifyDeposit(txHash)

      expect(result.benefitsGranted).toBe(false)
      expect(result.record.status).toBe('pending')
    })

    it('should verify deposit with failed status', async () => {
      const txHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'

      const mockResponse: VerifyDepositResponse = {
        record: {
          id: 'deposit-1',
          userId: 'user-123',
          txHash,
          tokenType: 'USDT',
          amount: '100.00',
          usdAmount: 100,
          benefitType: 'points',
          benefitAmount: 1000,
          status: 'failed',
          createdAt: '2024-01-15T10:00:00Z',
        },
        benefitsGranted: false,
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockResponse,
      })

      const depositApi = new DepositAPI()
      const result = await depositApi.verifyDeposit(txHash)

      expect(result.record.status).toBe('failed')
      expect(result.benefitsGranted).toBe(false)
    })

    it('should handle deposit not found error', async () => {
      const txHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          error: {
            code: 'DEPOSIT_NOT_FOUND',
            message: 'Deposit record not found',
          },
        }),
      })

      const depositApi = new DepositAPI()

      await expect(depositApi.verifyDeposit(txHash)).rejects.toThrow(
        'Deposit record not found'
      )
    })
  })

  describe('verifyDepositWithPolling', () => {
    it('should successfully verify deposit on first attempt', async () => {
      const txHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'

      const mockResponse: VerifyDepositResponse = {
        record: {
          id: 'deposit-1',
          userId: 'user-123',
          txHash,
          tokenType: 'USDT',
          amount: '100.00',
          usdAmount: 100,
          benefitType: 'points',
          benefitAmount: 1000,
          status: 'confirmed',
          createdAt: '2024-01-15T10:00:00Z',
          confirmedAt: '2024-01-15T10:05:00Z',
        },
        benefitsGranted: true,
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockResponse,
      })

      const depositApi = new DepositAPI()
      const result = await depositApi.verifyDepositWithPolling(txHash, {
        interval: 100,
        maxAttempts: 5,
      })

      expect(result.benefitsGranted).toBe(true)
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })

    it('should poll multiple times until benefits granted', async () => {
      const txHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'

      const pendingResponse: VerifyDepositResponse = {
        record: {
          id: 'deposit-1',
          userId: 'user-123',
          txHash,
          tokenType: 'USDT',
          amount: '100.00',
          usdAmount: 100,
          benefitType: 'points',
          benefitAmount: 1000,
          status: 'pending',
          createdAt: '2024-01-15T10:00:00Z',
        },
        benefitsGranted: false,
      }

      const confirmedResponse: VerifyDepositResponse = {
        ...pendingResponse,
        record: {
          ...pendingResponse.record,
          status: 'confirmed',
          confirmedAt: '2024-01-15T10:05:00Z',
        },
        benefitsGranted: true,
      }

      // Mock 3 pending responses, then 1 confirmed
      ;(global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => pendingResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => pendingResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => pendingResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => confirmedResponse,
        })

      const depositApi = new DepositAPI()
      const result = await depositApi.verifyDepositWithPolling(txHash, {
        interval: 50,
        maxAttempts: 10,
      })

      expect(result.benefitsGranted).toBe(true)
      expect(global.fetch).toHaveBeenCalledTimes(4)
    })

    it('should throw error when deposit fails', async () => {
      const txHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'

      const failedResponse: VerifyDepositResponse = {
        record: {
          id: 'deposit-1',
          userId: 'user-123',
          txHash,
          tokenType: 'USDT',
          amount: '100.00',
          usdAmount: 100,
          benefitType: 'points',
          benefitAmount: 1000,
          status: 'failed',
          createdAt: '2024-01-15T10:00:00Z',
        },
        benefitsGranted: false,
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => failedResponse,
      })

      const depositApi = new DepositAPI()

      try {
        await depositApi.verifyDepositWithPolling(txHash, {
          interval: 50,
          maxAttempts: 5,
        })
        // Should not reach here
        expect(true).toBe(false)
      } catch (error) {
        expect(error).toBeInstanceOf(APIClientError)
        expect((error as APIClientError).code).toBe('DEPOSIT_FAILED')
      }
    })

    it('should timeout after max attempts', async () => {
      const txHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'

      const pendingResponse: VerifyDepositResponse = {
        record: {
          id: 'deposit-1',
          userId: 'user-123',
          txHash,
          tokenType: 'USDT',
          amount: '100.00',
          usdAmount: 100,
          benefitType: 'points',
          benefitAmount: 1000,
          status: 'pending',
          createdAt: '2024-01-15T10:00:00Z',
        },
        benefitsGranted: false,
      }

      // Always return pending
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => pendingResponse,
      })

      const depositApi = new DepositAPI()

      await expect(
        depositApi.verifyDepositWithPolling(txHash, {
          interval: 50,
          maxAttempts: 3,
        })
      ).rejects.toThrow('Deposit verification timeout after 3 attempts')

      try {
        await depositApi.verifyDepositWithPolling(txHash, {
          interval: 50,
          maxAttempts: 3,
        })
      } catch (error) {
        expect(error).toBeInstanceOf(APIClientError)
        expect((error as APIClientError).code).toBe('VERIFICATION_TIMEOUT')
      }

      expect(global.fetch).toHaveBeenCalledTimes(6) // 3 from first call, 3 from second
    })

    it('should use default polling options', async () => {
      const txHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'

      const mockResponse: VerifyDepositResponse = {
        record: {
          id: 'deposit-1',
          userId: 'user-123',
          txHash,
          tokenType: 'USDT',
          amount: '100.00',
          usdAmount: 100,
          benefitType: 'points',
          benefitAmount: 1000,
          status: 'confirmed',
          createdAt: '2024-01-15T10:00:00Z',
          confirmedAt: '2024-01-15T10:05:00Z',
        },
        benefitsGranted: true,
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockResponse,
      })

      const depositApi = new DepositAPI()
      const result = await depositApi.verifyDepositWithPolling(txHash)

      expect(result.benefitsGranted).toBe(true)
    })

    it('should retry on network errors', async () => {
      const txHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'

      const successResponse: VerifyDepositResponse = {
        record: {
          id: 'deposit-1',
          userId: 'user-123',
          txHash,
          tokenType: 'USDT',
          amount: '100.00',
          usdAmount: 100,
          benefitType: 'points',
          benefitAmount: 1000,
          status: 'confirmed',
          createdAt: '2024-01-15T10:00:00Z',
          confirmedAt: '2024-01-15T10:05:00Z',
        },
        benefitsGranted: true,
      }

      // First call fails with network error, second succeeds
      ;(global.fetch as any)
        .mockRejectedValueOnce(new TypeError('Failed to fetch'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => successResponse,
        })

      const depositApi = new DepositAPI()
      const result = await depositApi.verifyDepositWithPolling(txHash, {
        interval: 50,
        maxAttempts: 5,
      })

      expect(result.benefitsGranted).toBe(true)
      expect(global.fetch).toHaveBeenCalledTimes(2)
    })

    it('should throw error if all attempts fail with network error', async () => {
      const txHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'

      // All calls fail with network error
      ;(global.fetch as any).mockRejectedValue(new TypeError('Failed to fetch'))

      const depositApi = new DepositAPI()

      await expect(
        depositApi.verifyDepositWithPolling(txHash, {
          interval: 50,
          maxAttempts: 3,
        })
      ).rejects.toThrow('Network error')

      expect(global.fetch).toHaveBeenCalledTimes(3)
    })
  })

  describe('Integration with API Client', () => {
    it('should use configured base URL from SDK config', async () => {
      const request: SaveDepositRecordRequest = {
        txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        tokenType: 'USDT',
        amount: '100.00',
        benefitType: 'points',
        benefitAmount: 1000,
      }

      const mockResponse: DepositRecord = {
        id: 'deposit-1',
        userId: 'user-123',
        txHash: request.txHash,
        tokenType: 'USDT',
        amount: '100.00',
        usdAmount: 100,
        benefitType: 'points',
        benefitAmount: 1000,
        status: 'pending',
        createdAt: '2024-01-15T10:00:00Z',
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockResponse,
      })

      const depositApi = new DepositAPI()
      await depositApi.saveDepositRecord(request)

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('https://api.example.com'),
        expect.any(Object)
      )
    })

    it('should include app ID in request headers', async () => {
      const request: SaveDepositRecordRequest = {
        txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        tokenType: 'USDT',
        amount: '100.00',
        benefitType: 'points',
        benefitAmount: 1000,
      }

      const mockResponse: DepositRecord = {
        id: 'deposit-1',
        userId: 'user-123',
        txHash: request.txHash,
        tokenType: 'USDT',
        amount: '100.00',
        usdAmount: 100,
        benefitType: 'points',
        benefitAmount: 1000,
        status: 'pending',
        createdAt: '2024-01-15T10:00:00Z',
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockResponse,
      })

      const depositApi = new DepositAPI()
      await depositApi.saveDepositRecord(request)

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-App-Id': 'test-app-id',
          }),
        })
      )
    })

    it('should include Content-Type header', async () => {
      const txHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'

      const mockResponse: VerifyDepositResponse = {
        record: {
          id: 'deposit-1',
          userId: 'user-123',
          txHash,
          tokenType: 'USDT',
          amount: '100.00',
          usdAmount: 100,
          benefitType: 'points',
          benefitAmount: 1000,
          status: 'confirmed',
          createdAt: '2024-01-15T10:00:00Z',
          confirmedAt: '2024-01-15T10:05:00Z',
        },
        benefitsGranted: true,
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockResponse,
      })

      const depositApi = new DepositAPI()
      await depositApi.verifyDeposit(txHash)

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      )
    })
  })
})
