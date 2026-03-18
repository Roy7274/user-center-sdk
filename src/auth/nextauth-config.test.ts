import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createAuthOptions } from './nextauth-config'
import { initSDKConfig, resetSDKConfig } from '../config/sdk-config'

describe('NextAuth Configuration', () => {
  beforeEach(() => {
    resetSDKConfig()
    initSDKConfig({
      userCenterUrl: 'https://api.example.com',
      appId: 'test-app-id',
      bscNetwork: 'testnet',
      contractAddress: '0x1234567890123456789012345678901234567890',
      usdtAddress: '0x0987654321098765432109876543210987654321',
      nextAuthSecret: 'test-secret',
    })
  })

  describe('createAuthOptions', () => {
    it('should create NextAuth options with JWT strategy', () => {
      const options = createAuthOptions()

      expect(options.session?.strategy).toBe('jwt')
      expect(options.session?.maxAge).toBe(30 * 24 * 60 * 60) // 30 days
    })

    it('should configure custom pages', () => {
      const options = createAuthOptions()

      expect(options.pages?.signIn).toBe('/auth/signin')
      expect(options.pages?.error).toBe('/auth/error')
    })

    it('should include Web3Auth, User Center, and Guest providers when enabled', () => {
      const options = createAuthOptions()

      // Should have Web3Auth + User Center + Guest providers
      expect(options.providers).toHaveLength(3)
      expect(options.providers[0].type).toBe('credentials')
      expect(options.providers[1].type).toBe('credentials')
      expect(options.providers[2].type).toBe('credentials')
      // All are credentials providers but with different ids internally
    })

    it('should exclude Web3Auth provider when disabled', () => {
      resetSDKConfig()
      initSDKConfig({
        userCenterUrl: 'https://api.example.com',
        appId: 'test-app-id',
        bscNetwork: 'testnet',
        contractAddress: '0x1234567890123456789012345678901234567890',
        usdtAddress: '0x0987654321098765432109876543210987654321',
        nextAuthSecret: 'test-secret',
        enableWeb3Auth: false,
      })

      const options = createAuthOptions()

      // Should have User Center + Guest providers (Web3Auth disabled)
      expect(options.providers).toHaveLength(2)
      expect(options.providers[0].type).toBe('credentials')
      expect(options.providers[1].type).toBe('credentials')
    })

    it('should exclude Guest provider when disabled', () => {
      resetSDKConfig()
      initSDKConfig({
        userCenterUrl: 'https://api.example.com',
        appId: 'test-app-id',
        bscNetwork: 'testnet',
        contractAddress: '0x1234567890123456789012345678901234567890',
        usdtAddress: '0x0987654321098765432109876543210987654321',
        nextAuthSecret: 'test-secret',
        enableGuestLogin: false,
      })

      const options = createAuthOptions()

      // Should have Web3Auth + User Center providers (Guest disabled)
      expect(options.providers).toHaveLength(2)
      expect(options.providers[0].type).toBe('credentials')
      expect(options.providers[1].type).toBe('credentials')
    })

    it('should configure JWT callback', () => {
      const options = createAuthOptions()

      expect(options.callbacks?.jwt).toBeDefined()
      expect(typeof options.callbacks?.jwt).toBe('function')
    })

    it('should configure session callback', () => {
      const options = createAuthOptions()

      expect(options.callbacks?.session).toBeDefined()
      expect(typeof options.callbacks?.session).toBe('function')
    })

    it('should use configured secret', () => {
      const options = createAuthOptions()

      expect(options.secret).toBe('test-secret')
    })
  })

  describe('JWT callback', () => {
    it('should store user data and access token on initial sign in', async () => {
      const options = createAuthOptions()
      const jwtCallback = options.callbacks?.jwt

      if (!jwtCallback) {
        throw new Error('JWT callback not defined')
      }

      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        type: 'regular',
        roles: ['user'],
        permissions: ['read'],
        createdAt: '2024-01-01T00:00:00Z',
      }

      const mockAccount = {
        provider: 'credentials',
        type: 'credentials' as const,
        providerAccountId: 'user-123',
      }

      const result = await jwtCallback({
        token: {},
        user: mockUser,
        account: mockAccount,
        trigger: 'signIn',
      } as any)

      expect(result.access_token).toBe('mock-access-token')
      expect(result.refresh_token).toBe('mock-refresh-token')
      expect(result.user).toMatchObject({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        type: 'regular',
        provider: 'credentials',
        roles: ['user'],
        permissions: ['read'],
      })
      expect(result.expiresAt).toBeGreaterThan(Date.now())
    })

    it('should return existing token if no refresh needed', async () => {
      const options = createAuthOptions()
      const jwtCallback = options.callbacks?.jwt

      if (!jwtCallback) {
        throw new Error('JWT callback not defined')
      }

      const mockToken = {
        access_token: 'existing-token',
        refresh_token: 'existing-refresh',
        user: {
          id: 'user-123',
          type: 'regular',
          roles: [],
          permissions: [],
          createdAt: '2024-01-01T00:00:00Z',
        },
        expiresAt: Date.now() + 10 * 60 * 1000, // Expires in 10 minutes
      }

      const result = await jwtCallback({
        token: mockToken,
        trigger: 'update',
      } as any)

      expect(result).toEqual(mockToken)
    })

    it('should handle missing user data gracefully', async () => {
      const options = createAuthOptions()
      const jwtCallback = options.callbacks?.jwt

      if (!jwtCallback) {
        throw new Error('JWT callback not defined')
      }

      const mockUser = {
        id: 'user-123',
        access_token: 'mock-token',
      }

      const mockAccount = {
        provider: 'credentials',
        type: 'credentials' as const,
        providerAccountId: 'user-123',
      }

      const result = await jwtCallback({
        token: {},
        user: mockUser,
        account: mockAccount,
        trigger: 'signIn',
      } as any)

      expect(result.user).toMatchObject({
        id: 'user-123',
        type: 'regular',
        roles: [],
        permissions: [],
      })
    })
  })

  describe('Session callback', () => {
    it('should map JWT token to session structure', async () => {
      const options = createAuthOptions()
      const sessionCallback = options.callbacks?.session

      if (!sessionCallback) {
        throw new Error('Session callback not defined')
      }

      const mockToken = {
        access_token: 'mock-access-token',
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          type: 'regular' as const,
          roles: ['user'],
          permissions: ['read'],
          createdAt: '2024-01-01T00:00:00Z',
        },
      }

      const mockSession = {
        expires: '2024-12-31T23:59:59Z',
      }

      const result = await sessionCallback({
        session: mockSession as any,
        token: mockToken as any,
      } as any)

      expect(result.access_token).toBe('mock-access-token')
      expect(result.user).toEqual(mockToken.user)
      expect(result.expires).toBe('2024-12-31T23:59:59Z')
    })
  })
})
