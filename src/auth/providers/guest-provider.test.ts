import { describe, it, expect, beforeEach } from 'vitest'
import { createGuestProvider, generateGuestId } from './guest-provider'
import { initSDKConfig, resetSDKConfig } from '../../config/sdk-config'

describe('Guest Provider', () => {
  beforeEach(() => {
    resetSDKConfig()
    initSDKConfig({
      userCenterUrl: 'https://api.example.com',
      appId: 'test-app-id',
      bscNetwork: 'testnet',
      contractAddress: '0x1234567890123456789012345678901234567890',
      usdtAddress: '0x0987654321098765432109876543210987654321',
    })
  })

  describe('generateGuestId', () => {
    it('should generate a guest ID with correct format', () => {
      const guestId = generateGuestId()

      expect(guestId).toMatch(/^guest_\d+_[a-z0-9]+$/)
    })

    it('should generate unique guest IDs', () => {
      const id1 = generateGuestId()
      const id2 = generateGuestId()

      expect(id1).not.toBe(id2)
    })

    it('should start with "guest_" prefix', () => {
      const guestId = generateGuestId()

      expect(guestId).toMatch(/^guest_/)
    })

    it('should contain timestamp component', () => {
      const beforeTimestamp = Date.now()
      const guestId = generateGuestId()
      const afterTimestamp = Date.now()

      // Extract timestamp from guest ID
      const timestampStr = guestId.split('_')[1]
      const timestamp = parseInt(timestampStr, 10)

      expect(timestamp).toBeGreaterThanOrEqual(beforeTimestamp)
      expect(timestamp).toBeLessThanOrEqual(afterTimestamp)
    })
  })

  describe('createGuestProvider', () => {
    it('should create a credentials provider', () => {
      const provider = createGuestProvider()

      expect(provider).toBeDefined()
      expect(provider.type).toBe('credentials')
    })

    it('should have authorize function', () => {
      const provider = createGuestProvider()

      expect(provider.authorize).toBeDefined()
      expect(typeof provider.authorize).toBe('function')
    })

    it('should be configured with guest id and name', () => {
      const provider = createGuestProvider()

      // The provider is configured with id 'guest' and name 'Guest'
      // These are used internally by NextAuth
      expect(provider).toHaveProperty('id')
      expect(provider).toHaveProperty('name')
    })

    it('should have credentials defined', () => {
      const provider = createGuestProvider()

      expect(provider).toHaveProperty('credentials')
      expect(provider.credentials).toBeDefined()
    })
  })
})
