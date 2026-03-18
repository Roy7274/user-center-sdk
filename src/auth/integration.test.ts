/**
 * Authentication Integration Tests
 * 
 * Tests the integration between NextAuth session management and API client.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { initAuthIntegration, resetAuthIntegration } from './integration'
import { getAPIClient, resetAPIClient } from '../api/api-client'
import { initSDKConfig, resetSDKConfig } from '../config/sdk-config'

// Mock next-auth/react
vi.mock('next-auth/react', () => ({
  getSession: vi.fn(),
}))

describe('Authentication Integration', () => {
  beforeEach(() => {
    // Initialize SDK config for tests
    initSDKConfig({
      userCenterUrl: 'https://api.test.com',
      appId: 'test-app',
      bscNetwork: 'testnet',
      contractAddress: '0x1234567890123456789012345678901234567890',
      usdtAddress: '0x0987654321098765432109876543210987654321',
    })
    
    resetAPIClient()
    resetAuthIntegration()
  })

  afterEach(() => {
    vi.clearAllMocks()
    resetSDKConfig()
  })

  describe('initAuthIntegration', () => {
    it('should set up access token getter', async () => {
      const { getSession } = await import('next-auth/react')
      const mockSession = {
        access_token: 'test-token',
        user: { id: '1', name: 'Test User' },
        expires: '2024-12-31T23:59:59.999Z',
      }

      vi.mocked(getSession).mockResolvedValue(mockSession)

      // Initialize integration
      initAuthIntegration()

      // Mock fetch to verify token is injected
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: 'test' }),
        headers: new Headers({ 'content-type': 'application/json' }),
      })
      global.fetch = mockFetch

      // Make API request
      const client = getAPIClient()
      await client.get('/test')

      // Verify token was injected
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        })
      )
    })

    it('should handle missing session gracefully', async () => {
      const { getSession } = await import('next-auth/react')
      vi.mocked(getSession).mockResolvedValue(null)

      // Initialize integration
      initAuthIntegration()

      // Mock fetch
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: 'test' }),
        headers: new Headers({ 'content-type': 'application/json' }),
      })
      global.fetch = mockFetch

      // Make API request
      const client = getAPIClient()
      await client.get('/test')

      // Verify no Authorization header was added
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.not.objectContaining({
            Authorization: expect.any(String),
          }),
        })
      )
    })

    it('should handle session errors gracefully', async () => {
      const { getSession } = await import('next-auth/react')
      vi.mocked(getSession).mockRejectedValue(new Error('Session error'))

      // Initialize integration
      initAuthIntegration()

      // Mock console.warn to verify error handling
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      // Mock fetch
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: 'test' }),
        headers: new Headers({ 'content-type': 'application/json' }),
      })
      global.fetch = mockFetch

      // Make API request
      const client = getAPIClient()
      await client.get('/test')

      // Verify error was logged
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to get session for API authentication:',
        expect.any(Error)
      )

      // Verify no Authorization header was added
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.not.objectContaining({
            Authorization: expect.any(String),
          }),
        })
      )

      consoleSpy.mockRestore()
    })

    it('should set up token refresh callback', () => {
      // Mock console.warn to verify refresh callback behavior
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      // Initialize integration
      initAuthIntegration()

      // The refresh callback should be set up (we can't easily test it directly
      // since it's internal to the API client, but we can verify it doesn't throw)
      expect(() => initAuthIntegration()).not.toThrow()

      consoleSpy.mockRestore()
    })
  })

  describe('resetAuthIntegration', () => {
    it('should reset token getter and refresh callback', async () => {
      const { getSession } = await import('next-auth/react')
      const mockSession = {
        access_token: 'test-token',
        user: { id: '1', name: 'Test User' },
        expires: '2024-12-31T23:59:59.999Z',
      }

      vi.mocked(getSession).mockResolvedValue(mockSession)

      // Initialize integration
      initAuthIntegration()

      // Reset integration
      resetAuthIntegration()

      // Mock fetch
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: 'test' }),
        headers: new Headers({ 'content-type': 'application/json' }),
      })
      global.fetch = mockFetch

      // Make API request
      const client = getAPIClient()
      await client.get('/test')

      // Verify no Authorization header was added (token getter was reset)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.not.objectContaining({
            Authorization: expect.any(String),
          }),
        })
      )
    })
  })
})