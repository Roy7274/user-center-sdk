/**
 * Tests for User Center Credentials Provider
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createUserCenterProvider, extractTokenFromUrl } from './user-center-provider'
import { initSDKConfig, resetSDKConfig } from '../../config/sdk-config'

describe('User Center Provider', () => {
  beforeEach(() => {
    // Initialize SDK config for tests
    initSDKConfig({
      userCenterUrl: 'https://test-user-center.com',
      appId: 'test-app-id',
      bscNetwork: 'testnet',
      contractAddress: '0x1234567890123456789012345678901234567890',
      usdtAddress: '0x0987654321098765432109876543210987654321',
    })
  })

  afterEach(() => {
    resetSDKConfig()
    vi.restoreAllMocks()
  })

  describe('createUserCenterProvider', () => {
    it('should create a credentials provider', () => {
      const provider = createUserCenterProvider()

      expect(provider).toBeDefined()
      expect(provider.type).toBe('credentials')
    })

    it('should have authorize function', () => {
      const provider = createUserCenterProvider()

      expect(provider.authorize).toBeDefined()
      expect(typeof provider.authorize).toBe('function')
    })

    it('should be configured with User Center id and name', () => {
      const provider = createUserCenterProvider()

      // The provider is configured with id 'usercenter' and name 'User Center'
      // These are used internally by NextAuth
      expect(provider).toHaveProperty('id')
      expect(provider).toHaveProperty('name')
    })

    it('should have token and redirectUrl credentials', () => {
      const provider = createUserCenterProvider()

      expect(provider).toHaveProperty('credentials')
      expect(provider.credentials).toBeDefined()
    })
  })

  describe('extractTokenFromUrl', () => {
    it('should extract token from query parameter', () => {
      const url = 'https://app.com/callback?token=abc123'
      const token = extractTokenFromUrl(url)
      expect(token).toBe('abc123')
    })

    it('should extract token from hash fragment', () => {
      const url = 'https://app.com/callback#token=xyz789'
      const token = extractTokenFromUrl(url)
      expect(token).toBe('xyz789')
    })

    it('should prioritize query parameter over hash fragment', () => {
      const url = 'https://app.com/callback?token=query-token#token=hash-token'
      const token = extractTokenFromUrl(url)
      expect(token).toBe('query-token')
    })

    it('should handle URL with multiple query parameters', () => {
      const url = 'https://app.com/callback?foo=bar&token=multi-param&baz=qux'
      const token = extractTokenFromUrl(url)
      expect(token).toBe('multi-param')
    })

    it('should handle URL with multiple hash parameters', () => {
      const url = 'https://app.com/callback#foo=bar&token=multi-hash&baz=qux'
      const token = extractTokenFromUrl(url)
      expect(token).toBe('multi-hash')
    })

    it('should return null if no token in URL', () => {
      const url = 'https://app.com/callback?foo=bar'
      const token = extractTokenFromUrl(url)
      expect(token).toBeNull()
    })

    it('should return null for invalid URL', () => {
      const url = 'not-a-valid-url'
      const token = extractTokenFromUrl(url)
      expect(token).toBeNull()
    })

    it('should handle URL with encoded token', () => {
      const url = 'https://app.com/callback?token=abc%20123%2Bdef'
      const token = extractTokenFromUrl(url)
      expect(token).toBe('abc 123+def')
    })

    it('should return null for empty token parameter', () => {
      const url = 'https://app.com/callback?token='
      const token = extractTokenFromUrl(url)
      // Empty token parameter should return null (no valid token)
      expect(token).toBeNull()
    })

    it('should return null for whitespace-only token', () => {
      const url = 'https://app.com/callback?token=%20%20'
      const token = extractTokenFromUrl(url)
      expect(token).toBeNull()
    })
  })
})
