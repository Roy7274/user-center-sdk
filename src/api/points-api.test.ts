/**
 * Tests for Points API
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  PointsAPI,
  createPointsAPI,
  getPointsAPI,
  resetPointsAPI,
  type PointsLedgerQuery,
} from './points-api'
import { resetAPIClient } from './api-client'
import { initSDKConfig, resetSDKConfig } from '../config/sdk-config'
import type {
  PointsBalance,
  PointsLedgerResponse,
  CheckInResult,
} from '../types/points'

// Mock fetch
global.fetch = vi.fn()

describe('PointsAPI', () => {
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
    resetPointsAPI()
  })

  afterEach(() => {
    resetSDKConfig()
  })

  describe('Constructor and Singleton', () => {
    it('should create PointsAPI instance', () => {
      const pointsApi = new PointsAPI()
      expect(pointsApi).toBeInstanceOf(PointsAPI)
    })

    it('should return same instance from getPointsAPI', () => {
      const api1 = getPointsAPI()
      const api2 = getPointsAPI()
      expect(api1).toBe(api2)
    })

    it('should create new instance after reset', () => {
      const api1 = getPointsAPI()
      resetPointsAPI()
      const api2 = getPointsAPI()
      expect(api1).not.toBe(api2)
    })

    it('should create new instance with createPointsAPI', () => {
      const api1 = createPointsAPI()
      const api2 = createPointsAPI()
      expect(api1).not.toBe(api2)
    })
  })

  describe('getBalance', () => {
    it('should successfully get points balance', async () => {
      const mockResponse: PointsBalance = {
        available: 1000,
        frozen: 200,
        total: 1200,
        level: {
          level: 'VIP',
          name: 'VIP Member',
          benefits: ['10% bonus', 'Priority support'],
        },
        levelExpireAt: '2024-12-31T23:59:59Z',
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockResponse,
      })

      const pointsApi = new PointsAPI()
      const result = await pointsApi.getBalance()

      expect(result).toEqual(mockResponse)
      expect(result.available).toBe(1000)
      expect(result.frozen).toBe(200)
      expect(result.total).toBe(1200)
      expect(result.level.level).toBe('VIP')
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/points/balance',
        expect.objectContaining({
          method: 'GET',
        })
      )
    })

    it('should get balance for FREE member', async () => {
      const mockResponse: PointsBalance = {
        available: 50,
        frozen: 0,
        total: 50,
        level: {
          level: 'FREE',
          name: 'Free Member',
          benefits: ['Basic access'],
        },
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockResponse,
      })

      const pointsApi = new PointsAPI()
      const result = await pointsApi.getBalance()

      expect(result.level.level).toBe('FREE')
      expect(result.levelExpireAt).toBeUndefined()
    })

    it('should get balance for SVIP member', async () => {
      const mockResponse: PointsBalance = {
        available: 5000,
        frozen: 500,
        total: 5500,
        level: {
          level: 'SVIP',
          name: 'Super VIP',
          benefits: ['20% bonus', 'Priority support', 'Exclusive features'],
        },
        levelExpireAt: '2025-06-30T23:59:59Z',
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockResponse,
      })

      const pointsApi = new PointsAPI()
      const result = await pointsApi.getBalance()

      expect(result.level.level).toBe('SVIP')
      expect(result.level.benefits).toHaveLength(3)
    })

    it('should handle getBalance error', async () => {
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

      const pointsApi = new PointsAPI()

      await expect(pointsApi.getBalance()).rejects.toThrow('Authentication required')
    })

    it('should handle server error', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to fetch balance',
          },
        }),
      })

      const pointsApi = new PointsAPI()

      await expect(pointsApi.getBalance()).rejects.toThrow('Failed to fetch balance')
    })
  })

  describe('getLedger', () => {
    it('should successfully get points ledger with default pagination', async () => {
      const mockResponse: PointsLedgerResponse = {
        items: [
          {
            id: 'entry-1',
            userId: 'user-123',
            amount: 100,
            type: 'earn',
            source: 'checkin',
            description: 'Daily check-in reward',
            balance: 1100,
            createdAt: '2024-01-15T10:00:00Z',
          },
          {
            id: 'entry-2',
            userId: 'user-123',
            amount: -50,
            type: 'spend',
            source: 'consumption',
            description: 'Used for premium feature',
            balance: 1050,
            createdAt: '2024-01-14T15:30:00Z',
          },
        ],
        total: 50,
        page: 1,
        pageSize: 20,
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockResponse,
      })

      const pointsApi = new PointsAPI()
      const result = await pointsApi.getLedger()

      expect(result).toEqual(mockResponse)
      expect(result.items).toHaveLength(2)
      expect(result.total).toBe(50)
      expect(result.page).toBe(1)
      expect(result.pageSize).toBe(20)
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/points/ledger',
        expect.objectContaining({
          method: 'GET',
        })
      )
    })

    it('should get ledger with custom pagination', async () => {
      const query: PointsLedgerQuery = {
        page: 2,
        pageSize: 10,
      }

      const mockResponse: PointsLedgerResponse = {
        items: [
          {
            id: 'entry-11',
            userId: 'user-123',
            amount: 200,
            type: 'earn',
            source: 'deposit',
            description: 'Deposit bonus',
            balance: 900,
            createdAt: '2024-01-10T12:00:00Z',
          },
        ],
        total: 50,
        page: 2,
        pageSize: 10,
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockResponse,
      })

      const pointsApi = new PointsAPI()
      const result = await pointsApi.getLedger(query)

      expect(result.page).toBe(2)
      expect(result.pageSize).toBe(10)
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/points/ledger?page=2&pageSize=10',
        expect.objectContaining({
          method: 'GET',
        })
      )
    })

    it('should get ledger with only page parameter', async () => {
      const query: PointsLedgerQuery = {
        page: 3,
      }

      const mockResponse: PointsLedgerResponse = {
        items: [],
        total: 50,
        page: 3,
        pageSize: 20,
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockResponse,
      })

      const pointsApi = new PointsAPI()
      const result = await pointsApi.getLedger(query)

      expect(result.page).toBe(3)
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/points/ledger?page=3',
        expect.objectContaining({
          method: 'GET',
        })
      )
    })

    it('should get ledger with only pageSize parameter', async () => {
      const query: PointsLedgerQuery = {
        pageSize: 5,
      }

      const mockResponse: PointsLedgerResponse = {
        items: [],
        total: 50,
        page: 1,
        pageSize: 5,
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockResponse,
      })

      const pointsApi = new PointsAPI()
      const result = await pointsApi.getLedger(query)

      expect(result.pageSize).toBe(5)
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/points/ledger?pageSize=5',
        expect.objectContaining({
          method: 'GET',
        })
      )
    })

    it('should handle empty ledger', async () => {
      const mockResponse: PointsLedgerResponse = {
        items: [],
        total: 0,
        page: 1,
        pageSize: 20,
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockResponse,
      })

      const pointsApi = new PointsAPI()
      const result = await pointsApi.getLedger()

      expect(result.items).toHaveLength(0)
      expect(result.total).toBe(0)
    })

    it('should handle ledger with expiring points', async () => {
      const mockResponse: PointsLedgerResponse = {
        items: [
          {
            id: 'entry-1',
            userId: 'user-123',
            amount: 100,
            type: 'earn',
            source: 'promotion',
            description: 'Promotional points',
            balance: 1100,
            expireAt: '2024-12-31T23:59:59Z',
            createdAt: '2024-01-01T00:00:00Z',
          },
        ],
        total: 1,
        page: 1,
        pageSize: 20,
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockResponse,
      })

      const pointsApi = new PointsAPI()
      const result = await pointsApi.getLedger()

      expect(result.items[0].expireAt).toBe('2024-12-31T23:59:59Z')
    })

    it('should handle getLedger error', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          error: {
            code: 'INVALID_PAGINATION',
            message: 'Invalid page number',
          },
        }),
      })

      const pointsApi = new PointsAPI()

      await expect(pointsApi.getLedger({ page: -1 })).rejects.toThrow('Invalid page number')
    })
  })

  describe('checkIn', () => {
    it('should successfully check in', async () => {
      const mockResponse: CheckInResult = {
        success: true,
        points: 10,
        consecutiveDays: 5,
        message: 'Check-in successful! You earned 10 points.',
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockResponse,
      })

      const pointsApi = new PointsAPI()
      const result = await pointsApi.checkIn()

      expect(result).toEqual(mockResponse)
      expect(result.success).toBe(true)
      expect(result.points).toBe(10)
      expect(result.consecutiveDays).toBe(5)
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/points/checkin',
        expect.objectContaining({
          method: 'POST',
        })
      )
    })

    it('should check in on first day', async () => {
      const mockResponse: CheckInResult = {
        success: true,
        points: 10,
        consecutiveDays: 1,
        message: 'First check-in! You earned 10 points.',
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockResponse,
      })

      const pointsApi = new PointsAPI()
      const result = await pointsApi.checkIn()

      expect(result.consecutiveDays).toBe(1)
    })

    it('should check in with bonus points for consecutive days', async () => {
      const mockResponse: CheckInResult = {
        success: true,
        points: 20,
        consecutiveDays: 7,
        message: '7-day streak! You earned 20 points with bonus.',
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockResponse,
      })

      const pointsApi = new PointsAPI()
      const result = await pointsApi.checkIn()

      expect(result.points).toBe(20)
      expect(result.consecutiveDays).toBe(7)
    })

    it('should handle already checked in error', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 409,
        statusText: 'Conflict',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          error: {
            code: 'ALREADY_CHECKED_IN',
            message: 'You have already checked in today',
          },
        }),
      })

      const pointsApi = new PointsAPI()

      await expect(pointsApi.checkIn()).rejects.toThrow('You have already checked in today')
    })

    it('should handle unauthorized check-in', async () => {
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

      const pointsApi = new PointsAPI()

      await expect(pointsApi.checkIn()).rejects.toThrow('Authentication required')
    })

    it('should handle server error during check-in', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to process check-in',
          },
        }),
      })

      const pointsApi = new PointsAPI()

      await expect(pointsApi.checkIn()).rejects.toThrow('Failed to process check-in')
    })
  })

  describe('Error Handling', () => {
    it('should handle timeout error', async () => {
      // Mock fetch to simulate timeout
      ;(global.fetch as any).mockImplementationOnce(() => {
        const error = new Error('The operation was aborted')
        error.name = 'AbortError'
        return Promise.reject(error)
      })

      const pointsApi = new PointsAPI()

      await expect(pointsApi.getBalance()).rejects.toThrow('Request timeout')
    })

    it('should handle network error', async () => {
      ;(global.fetch as any).mockRejectedValueOnce(new TypeError('Failed to fetch'))

      const pointsApi = new PointsAPI()

      await expect(pointsApi.getLedger()).rejects.toThrow('Network error')
    })

    it('should handle malformed JSON response', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => {
          throw new SyntaxError('Unexpected token')
        },
      })

      const pointsApi = new PointsAPI()

      await expect(pointsApi.checkIn()).rejects.toThrow()
    })
  })

  describe('Integration with API Client', () => {
    it('should use configured base URL from SDK config', async () => {
      const mockResponse: PointsBalance = {
        available: 100,
        frozen: 0,
        total: 100,
        level: {
          level: 'FREE',
          name: 'Free',
          benefits: [],
        },
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockResponse,
      })

      const pointsApi = new PointsAPI()
      await pointsApi.getBalance()

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('https://api.example.com'),
        expect.any(Object)
      )
    })

    it('should include app ID in request headers', async () => {
      const mockResponse: PointsBalance = {
        available: 100,
        frozen: 0,
        total: 100,
        level: {
          level: 'FREE',
          name: 'Free',
          benefits: [],
        },
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockResponse,
      })

      const pointsApi = new PointsAPI()
      await pointsApi.getBalance()

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
      const mockResponse: CheckInResult = {
        success: true,
        points: 10,
        consecutiveDays: 1,
        message: 'Check-in successful',
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockResponse,
      })

      const pointsApi = new PointsAPI()
      await pointsApi.checkIn()

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
