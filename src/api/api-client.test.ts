/**
 * Tests for API Client
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  APIClient,
  APIClientError,
  createAPIClient,
  getAPIClient,
  resetAPIClient,
  setTokenRefreshCallback,
  setAccessTokenGetter,
} from './api-client'
import { APIError, NetworkError } from '../utils/error-handling'
import { initSDKConfig, resetSDKConfig } from '../config/sdk-config'

// Mock fetch
global.fetch = vi.fn()

describe('APIClient', () => {
  beforeEach(() => {
    // Initialize SDK config with valid Ethereum addresses
    initSDKConfig({
      userCenterUrl: 'https://api.example.com',
      appId: 'test-app-id',
      bscNetwork: 'testnet',
      contractAddress: '0x1234567890123456789012345678901234567890',
      usdtAddress: '0x0987654321098765432109876543210987654321',
    })

    // Reset mocks
    vi.clearAllMocks()
    resetAPIClient()
  })

  afterEach(() => {
    resetSDKConfig()
  })

  describe('Constructor and Configuration', () => {
    it('should create client with default config', () => {
      const client = new APIClient()
      expect(client).toBeInstanceOf(APIClient)
    })

    it('should create client with custom config', () => {
      const client = new APIClient('https://custom.api.com', 'custom-app-id')
      expect(client).toBeInstanceOf(APIClient)
    })
  })

  describe('GET Requests', () => {
    it('should make successful GET request', async () => {
      const mockData = { id: '1', name: 'Test' }
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockData,
      })

      const client = new APIClient()
      const result = await client.get('/test')

      expect(result).toEqual(mockData)
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/test',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-App-Id': 'test-app-id',
          }),
        })
      )
    })

    it('should make GET request with query parameters', async () => {
      const mockData = { items: [] }
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockData,
      })

      const client = new APIClient()
      await client.get('/test', { params: { page: 1, limit: 10 } })

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/test?page=1&limit=10',
        expect.any(Object)
      )
    })

    it('should inject access token when available', async () => {
      const mockToken = 'test-access-token'
      setAccessTokenGetter(async () => mockToken)

      const mockData = { id: '1' }
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockData,
      })

      const client = new APIClient()
      await client.get('/protected')

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/protected',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockToken}`,
          }),
        })
      )
    })
  })

  describe('POST Requests', () => {
    it('should make successful POST request', async () => {
      const requestBody = { name: 'Test' }
      const mockResponse = { id: '1', name: 'Test' }
      
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockResponse,
      })

      const client = new APIClient()
      const result = await client.post('/test', requestBody)

      expect(result).toEqual(mockResponse)
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/test',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(requestBody),
        })
      )
    })
  })

  describe('Error Handling', () => {
    it('should handle 404 error', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          error: {
            code: 'NOT_FOUND',
            message: 'Resource not found',
          },
        }),
      })

      const client = new APIClient()
      
      try {
        await client.get('/not-found')
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect(error).toBeInstanceOf(APIClientError)
        expect((error as APIClientError).message).toBe('Resource not found')
      }
    })

    it('should handle 500 error', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Internal server error',
          },
        }),
      })

      const client = new APIClient()
      
      await expect(client.get('/error')).rejects.toThrow(APIClientError)
    })

    it('should handle network error', async () => {
      ;(global.fetch as any).mockRejectedValueOnce(new TypeError('Failed to fetch'))

      const client = new APIClient()
      
      await expect(client.get('/test')).rejects.toThrow(APIClientError)
      await expect(client.get('/test')).rejects.toThrow('Network error')
    })

    it('should handle timeout', async () => {
      // Mock fetch to simulate a timeout by rejecting with AbortError
      ;(global.fetch as any).mockImplementationOnce(() => {
        const error = new Error('The operation was aborted')
        error.name = 'AbortError'
        return Promise.reject(error)
      })

      const client = new APIClient()
      
      try {
        await client.get('/test', { timeout: 10 })
        expect.fail('Should have thrown a timeout error')
      } catch (error) {
        expect(error).toBeInstanceOf(APIClientError)
        expect((error as APIClientError).message).toBe('Request timeout')
        expect((error as APIClientError).code).toBe('TIMEOUT')
      }
    })
  })

  describe('Token Refresh on 401', () => {
    it('should refresh token and retry on 401', async () => {
      const oldToken = 'old-token'
      const newToken = 'new-token'
      const mockData = { id: '1' }

      // Set up token getter and refresh callback
      setAccessTokenGetter(async () => oldToken)
      setTokenRefreshCallback(async () => newToken)

      // First call returns 401
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Token expired',
          },
        }),
      })

      // Second call (after refresh) succeeds
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockData,
      })

      const client = new APIClient()
      const result = await client.get('/protected')

      expect(result).toEqual(mockData)
      expect(global.fetch).toHaveBeenCalledTimes(2)
      
      // Second call should have new token
      expect(global.fetch).toHaveBeenNthCalledWith(
        2,
        'https://api.example.com/protected',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${newToken}`,
          }),
        })
      )
    })

    it('should fail if token refresh fails', async () => {
      const oldToken = 'old-token'

      setAccessTokenGetter(async () => oldToken)
      setTokenRefreshCallback(async () => null) // Refresh fails

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Token expired',
          },
        }),
      })

      const client = new APIClient()
      
      await expect(client.get('/protected')).rejects.toThrow(APIClientError)
    })

    it('should not retry if no refresh callback is set', async () => {
      const token = 'test-token'
      setAccessTokenGetter(async () => token)
      // No refresh callback set

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Token expired',
          },
        }),
      })

      const client = new APIClient()
      
      await expect(client.get('/protected')).rejects.toThrow(APIClientError)
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })
  })

  describe('Response Parsing', () => {
    it('should parse APIResponse wrapper format', async () => {
      const mockData = { id: '1', name: 'Test' }
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          success: true,
          data: mockData,
        }),
      })

      const client = new APIClient()
      const result = await client.get('/test')

      expect(result).toEqual(mockData)
    })

    it('should handle APIResponse error format', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input',
            details: { field: 'email' },
          },
        }),
      })

      const client = new APIClient()
      
      try {
        await client.get('/test')
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect(error).toBeInstanceOf(APIClientError)
        expect((error as APIClientError).message).toBe('Invalid input')
      }
    })

    it('should handle empty 204 response', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 204,
        headers: new Headers(),
      })

      const client = new APIClient()
      const result = await client.delete('/test')

      expect(result).toEqual({})
    })
  })

  describe('Convenience Methods', () => {
    it('should support PUT method', async () => {
      const mockData = { id: '1', updated: true }
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockData,
      })

      const client = new APIClient()
      const result = await client.put('/test/1', { name: 'Updated' })

      expect(result).toEqual(mockData)
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/test/1',
        expect.objectContaining({
          method: 'PUT',
        })
      )
    })

    it('should support PATCH method', async () => {
      const mockData = { id: '1', patched: true }
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockData,
      })

      const client = new APIClient()
      const result = await client.patch('/test/1', { name: 'Patched' })

      expect(result).toEqual(mockData)
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/test/1',
        expect.objectContaining({
          method: 'PATCH',
        })
      )
    })

    it('should support DELETE method', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 204,
        headers: new Headers(),
      })

      const client = new APIClient()
      await client.delete('/test/1')

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/test/1',
        expect.objectContaining({
          method: 'DELETE',
        })
      )
    })
  })

  describe('Singleton Pattern', () => {
    it('should return same instance from getAPIClient', () => {
      const client1 = getAPIClient()
      const client2 = getAPIClient()

      expect(client1).toBe(client2)
    })

    it('should create new instance after reset', () => {
      const client1 = getAPIClient()
      resetAPIClient()
      const client2 = getAPIClient()

      expect(client1).not.toBe(client2)
    })
  })

  describe('Custom Headers', () => {
    it('should merge custom headers with default headers', async () => {
      const mockData = { id: '1' }
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockData,
      })

      const client = new APIClient()
      await client.get('/test', {
        headers: {
          'X-Custom-Header': 'custom-value',
        },
      })

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/test',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-App-Id': 'test-app-id',
            'X-Custom-Header': 'custom-value',
          }),
        })
      )
    })
  })
})
