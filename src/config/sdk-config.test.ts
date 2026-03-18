import { describe, it, expect, beforeEach } from 'vitest'
import {
  initSDKConfig,
  getSDKConfig,
  updateSDKConfig,
  isSDKInitialized,
  resetSDKConfig,
} from './sdk-config'
import { SDKConfig } from './types'

describe('SDK Configuration', () => {
  beforeEach(() => {
    resetSDKConfig()
  })

  describe('initSDKConfig', () => {
    it('should initialize SDK with valid configuration', () => {
      const config: Partial<SDKConfig> = {
        userCenterUrl: 'https://api.example.com',
        appId: 'test-app-id',
        bscNetwork: 'testnet',
        contractAddress: '0x1234567890123456789012345678901234567890',
        usdtAddress: '0x0987654321098765432109876543210987654321',
      }

      const result = initSDKConfig(config)

      expect(result.userCenterUrl).toBe(config.userCenterUrl)
      expect(result.appId).toBe(config.appId)
      expect(result.bscNetwork).toBe(config.bscNetwork)
      expect(isSDKInitialized()).toBe(true)
    })

    it('should throw error for invalid configuration', () => {
      const config = {
        userCenterUrl: 'invalid-url',
        appId: 'test-app-id',
        bscNetwork: 'testnet',
        contractAddress: 'invalid-address',
        usdtAddress: '0x0987654321098765432109876543210987654321',
      }

      expect(() => initSDKConfig(config as any)).toThrow()
    })

    it('should apply default values for optional fields', () => {
      const config: Partial<SDKConfig> = {
        userCenterUrl: 'https://api.example.com',
        appId: 'test-app-id',
        bscNetwork: 'testnet',
        contractAddress: '0x1234567890123456789012345678901234567890',
        usdtAddress: '0x0987654321098765432109876543210987654321',
      }

      const result = initSDKConfig(config)

      expect(result.enableGuestLogin).toBe(true)
      expect(result.enableWeb3Auth).toBe(true)
      expect(result.enableDeposit).toBe(true)
      expect(result.locale).toBe('en')
    })
  })

  describe('getSDKConfig', () => {
    it('should return initialized configuration', () => {
      const config: Partial<SDKConfig> = {
        userCenterUrl: 'https://api.example.com',
        appId: 'test-app-id',
        bscNetwork: 'testnet',
        contractAddress: '0x1234567890123456789012345678901234567890',
        usdtAddress: '0x0987654321098765432109876543210987654321',
      }

      initSDKConfig(config)
      const result = getSDKConfig()

      expect(result.userCenterUrl).toBe(config.userCenterUrl)
    })

    it('should throw error if SDK is not initialized', () => {
      expect(() => getSDKConfig()).toThrow(
        'SDK not initialized. Call initSDKConfig() before using the SDK.'
      )
    })
  })

  describe('updateSDKConfig', () => {
    it('should update configuration', () => {
      const config: Partial<SDKConfig> = {
        userCenterUrl: 'https://api.example.com',
        appId: 'test-app-id',
        bscNetwork: 'testnet',
        contractAddress: '0x1234567890123456789012345678901234567890',
        usdtAddress: '0x0987654321098765432109876543210987654321',
      }

      initSDKConfig(config)

      const updates = {
        locale: 'zh',
        enableGuestLogin: false,
      }

      const result = updateSDKConfig(updates)

      expect(result.locale).toBe('zh')
      expect(result.enableGuestLogin).toBe(false)
      expect(result.userCenterUrl).toBe(config.userCenterUrl)
    })

    it('should throw error if SDK is not initialized', () => {
      expect(() => updateSDKConfig({ locale: 'zh' })).toThrow(
        'SDK not initialized. Call initSDKConfig() before updating configuration.'
      )
    })

    it('should validate updated configuration', () => {
      const config: Partial<SDKConfig> = {
        userCenterUrl: 'https://api.example.com',
        appId: 'test-app-id',
        bscNetwork: 'testnet',
        contractAddress: '0x1234567890123456789012345678901234567890',
        usdtAddress: '0x0987654321098765432109876543210987654321',
      }

      initSDKConfig(config)

      expect(() =>
        updateSDKConfig({ contractAddress: 'invalid-address' } as any)
      ).toThrow()
    })
  })

  describe('isSDKInitialized', () => {
    it('should return false when SDK is not initialized', () => {
      expect(isSDKInitialized()).toBe(false)
    })

    it('should return true when SDK is initialized', () => {
      const config: Partial<SDKConfig> = {
        userCenterUrl: 'https://api.example.com',
        appId: 'test-app-id',
        bscNetwork: 'testnet',
        contractAddress: '0x1234567890123456789012345678901234567890',
        usdtAddress: '0x0987654321098765432109876543210987654321',
      }

      initSDKConfig(config)
      expect(isSDKInitialized()).toBe(true)
    })
  })

  describe('resetSDKConfig', () => {
    it('should reset SDK configuration', () => {
      const config: Partial<SDKConfig> = {
        userCenterUrl: 'https://api.example.com',
        appId: 'test-app-id',
        bscNetwork: 'testnet',
        contractAddress: '0x1234567890123456789012345678901234567890',
        usdtAddress: '0x0987654321098765432109876543210987654321',
      }

      initSDKConfig(config)
      expect(isSDKInitialized()).toBe(true)

      resetSDKConfig()
      expect(isSDKInitialized()).toBe(false)
    })
  })
})
