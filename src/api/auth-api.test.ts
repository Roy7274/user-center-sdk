/**
 * Tests for Authentication API
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  AuthAPI,
  createAuthAPI,
  getAuthAPI,
  resetAuthAPI,
  type Web3LoginRequest,
  type GuestLoginRequest,
  type VerifyTokenRequest,
  type RefreshTokenRequest,
} from './auth-api'
import { resetAPIClient } from './api-client'
import { initSDKConfig, resetSDKConfig } from '../config/sdk-config'
import type { AuthResponse, TokenVerifyResponse, RefreshTokenResponse } from '../types/auth'

// Mock fetch
global.fetch = vi.fn()

describe('AuthAPI', () => {
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
    resetAuthAPI()
  })

  afterEach(() => {
    resetSDKConfig()
  })

  describe('Constructor and Singleton', () => {
    it('should create AuthAPI instance', () => {
      const authApi = new AuthAPI()
      expect(authApi).toBeInstanceOf(AuthAPI)
    })

    it('should return same instance from getAuthAPI', () => {
      const api1 = getAuthAPI()
      const api2 = getAuthAPI()
      expect(api1).toBe(api2)
    })

    it('should create new instance after reset', () => {
      const api1 = getAuthAPI()
      resetAuthAPI()
      const api2 = getAuthAPI()
      expect(api1).not.toBe(api2)
    })

    it('should create new instance with createAuthAPI', () => {
      const api1 = createAuthAPI()
      const api2 = createAuthAPI()
      expect(api1).not.toBe(api2)
    })
  })

  describe('web3Login', () => {
    it('should successfully login with wallet address', async () => {
      const request: Web3LoginRequest = {
        walletAddress: '0x1234567890123456789012345678901234567890',
        userInfo: {
          email: 'user@example.com',
          name: 'John Doe',
          profileImage: 'https://example.com/avatar.jpg',
        },
      }

      const mockResponse: AuthResponse = {
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refresh_token: 'refresh-token-123',
        user: {
          id: 'user-123',
          email: 'user@example.com',
          name: 'John Doe',
          type: 'web3',
          walletAddress: '0x1234567890123456789012345678901234567890',
          profileImage: 'https://example.com/avatar.jpg',
          roles: ['user'],
          permissions: ['read'],
          createdAt: '2024-01-01T00:00:00Z',
        },
        expiresIn: 3600,
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockResponse,
      })

      const authApi = new AuthAPI()
      const result = await authApi.web3Login(request)

      expect(result).toEqual(mockResponse)
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/auth/web3Login',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(request),
        })
      )
    })

    it('should login with wallet address only', async () => {
      const request: Web3LoginRequest = {
        walletAddress: '0x1234567890123456789012345678901234567890',
      }

      const mockResponse: AuthResponse = {
        access_token: 'token-123',
        user: {
          id: 'user-123',
          type: 'web3',
          walletAddress: '0x1234567890123456789012345678901234567890',
          roles: ['user'],
          permissions: [],
          createdAt: '2024-01-01T00:00:00Z',
        },
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockResponse,
      })

      const authApi = new AuthAPI()
      const result = await authApi.web3Login(request)

      expect(result).toEqual(mockResponse)
    })

    it('should handle web3Login error', async () => {
      const request: Web3LoginRequest = {
        walletAddress: 'invalid-address',
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          error: {
            code: 'INVALID_WALLET_ADDRESS',
            message: 'Invalid wallet address format',
          },
        }),
      })

      const authApi = new AuthAPI()

      await expect(authApi.web3Login(request)).rejects.toThrow('Invalid wallet address format')
    })
  })

  describe('guestLogin', () => {
    it('should successfully login as guest', async () => {
      const request: GuestLoginRequest = {
        guestId: 'guest-123',
        deviceId: 'device-456',
      }

      const mockResponse: AuthResponse = {
        access_token: 'guest-token-123',
        user: {
          id: 'guest-123',
          type: 'guest',
          roles: ['guest'],
          permissions: ['read'],
          createdAt: '2024-01-01T00:00:00Z',
        },
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockResponse,
      })

      const authApi = new AuthAPI()
      const result = await authApi.guestLogin(request)

      expect(result).toEqual(mockResponse)
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/auth/guestLogin',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(request),
        })
      )
    })

    it('should login as guest without parameters', async () => {
      const mockResponse: AuthResponse = {
        access_token: 'guest-token-456',
        user: {
          id: 'guest-auto-generated',
          type: 'guest',
          roles: ['guest'],
          permissions: [],
          createdAt: '2024-01-01T00:00:00Z',
        },
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockResponse,
      })

      const authApi = new AuthAPI()
      const result = await authApi.guestLogin()

      expect(result).toEqual(mockResponse)
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/auth/guestLogin',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({}),
        })
      )
    })

    it('should handle guestLogin error', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to create guest user',
          },
        }),
      })

      const authApi = new AuthAPI()

      await expect(authApi.guestLogin()).rejects.toThrow('Failed to create guest user')
    })
  })

  describe('verifyToken', () => {
    it('should successfully verify valid token', async () => {
      const request: VerifyTokenRequest = {
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      }

      const mockResponse: TokenVerifyResponse = {
        valid: true,
        user: {
          id: 'user-123',
          email: 'user@example.com',
          name: 'John Doe',
          type: 'regular',
          roles: ['user'],
          permissions: ['read', 'write'],
          createdAt: '2024-01-01T00:00:00Z',
        },
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockResponse,
      })

      const authApi = new AuthAPI()
      const result = await authApi.verifyToken(request)

      expect(result).toEqual(mockResponse)
      expect(result.valid).toBe(true)
      expect(result.user).toBeDefined()
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/auth/verify',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(request),
        })
      )
    })

    it('should return invalid for expired token', async () => {
      const request: VerifyTokenRequest = {
        token: 'expired-token',
      }

      const mockResponse: TokenVerifyResponse = {
        valid: false,
        error: 'Token expired',
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockResponse,
      })

      const authApi = new AuthAPI()
      const result = await authApi.verifyToken(request)

      expect(result.valid).toBe(false)
      expect(result.error).toBe('Token expired')
      expect(result.user).toBeUndefined()
    })

    it('should handle verifyToken API error', async () => {
      const request: VerifyTokenRequest = {
        token: 'malformed-token',
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          error: {
            code: 'INVALID_TOKEN',
            message: 'Token format is invalid',
          },
        }),
      })

      const authApi = new AuthAPI()

      await expect(authApi.verifyToken(request)).rejects.toThrow('Token format is invalid')
    })
  })

  describe('refreshToken', () => {
    it('should successfully refresh token', async () => {
      const request: RefreshTokenRequest = {
        refresh_token: 'refresh-token-123',
      }

      const mockResponse: RefreshTokenResponse = {
        access_token: 'new-access-token-456',
        refresh_token: 'new-refresh-token-789',
        expiresIn: 3600,
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockResponse,
      })

      const authApi = new AuthAPI()
      const result = await authApi.refreshToken(request)

      expect(result).toEqual(mockResponse)
      expect(result.access_token).toBe('new-access-token-456')
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/auth/refresh',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(request),
        })
      )
    })

    it('should handle invalid refresh token', async () => {
      const request: RefreshTokenRequest = {
        refresh_token: 'invalid-refresh-token',
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          error: {
            code: 'INVALID_REFRESH_TOKEN',
            message: 'Refresh token is invalid or expired',
          },
        }),
      })

      const authApi = new AuthAPI()

      await expect(authApi.refreshToken(request)).rejects.toThrow(
        'Refresh token is invalid or expired'
      )
    })

    it('should return new tokens without refresh token', async () => {
      const request: RefreshTokenRequest = {
        refresh_token: 'refresh-token-123',
      }

      const mockResponse: RefreshTokenResponse = {
        access_token: 'new-access-token-only',
        expiresIn: 3600,
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockResponse,
      })

      const authApi = new AuthAPI()
      const result = await authApi.refreshToken(request)

      expect(result.access_token).toBe('new-access-token-only')
      expect(result.refresh_token).toBeUndefined()
    })
  })

  describe('logout', () => {
    it('should successfully logout', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 204,
        headers: new Headers(),
      })

      const authApi = new AuthAPI()
      await authApi.logout()

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/auth/logout',
        expect.objectContaining({
          method: 'POST',
        })
      )
    })

    it('should handle logout with JSON response', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ success: true }),
      })

      const authApi = new AuthAPI()
      await authApi.logout()

      expect(global.fetch).toHaveBeenCalledTimes(1)
    })

    it('should handle logout error', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          error: {
            code: 'LOGOUT_FAILED',
            message: 'Failed to invalidate session',
          },
        }),
      })

      const authApi = new AuthAPI()

      await expect(authApi.logout()).rejects.toThrow('Failed to invalidate session')
    })

    it('should handle network error during logout', async () => {
      ;(global.fetch as any).mockRejectedValueOnce(new TypeError('Network error'))

      const authApi = new AuthAPI()

      await expect(authApi.logout()).rejects.toThrow('Network error')
    })
  })

  describe('Error Handling and Retries', () => {
    it('should handle timeout error', async () => {
      const request: Web3LoginRequest = {
        walletAddress: '0x1234567890123456789012345678901234567890',
      }

      // Mock fetch to simulate timeout
      ;(global.fetch as any).mockImplementationOnce(() => {
        const error = new Error('The operation was aborted')
        error.name = 'AbortError'
        return Promise.reject(error)
      })

      const authApi = new AuthAPI()

      await expect(authApi.web3Login(request)).rejects.toThrow('Request timeout')
    })

    it('should handle network error', async () => {
      const request: GuestLoginRequest = {}

      ;(global.fetch as any).mockRejectedValueOnce(new TypeError('Failed to fetch'))

      const authApi = new AuthAPI()

      await expect(authApi.guestLogin(request)).rejects.toThrow('Network error')
    })

    it('should handle malformed JSON response', async () => {
      const request: VerifyTokenRequest = {
        token: 'test-token',
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => {
          throw new SyntaxError('Unexpected token')
        },
      })

      const authApi = new AuthAPI()

      await expect(authApi.verifyToken(request)).rejects.toThrow()
    })
  })

  describe('Integration with API Client', () => {
    it('should use configured base URL from SDK config', async () => {
      const mockResponse: AuthResponse = {
        access_token: 'token',
        user: {
          id: 'user-1',
          type: 'guest',
          roles: [],
          permissions: [],
          createdAt: '2024-01-01T00:00:00Z',
        },
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockResponse,
      })

      const authApi = new AuthAPI()
      await authApi.guestLogin()

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('https://api.example.com'),
        expect.any(Object)
      )
    })

    it('should include app ID in request headers', async () => {
      const mockResponse: AuthResponse = {
        access_token: 'token',
        user: {
          id: 'user-1',
          type: 'guest',
          roles: [],
          permissions: [],
          createdAt: '2024-01-01T00:00:00Z',
        },
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockResponse,
      })

      const authApi = new AuthAPI()
      await authApi.guestLogin()

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-App-Id': 'test-app-id',
          }),
        })
      )
    })
  })
})
