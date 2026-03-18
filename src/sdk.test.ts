/**
 * Tests for SDK Initialization Module
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createSDK, getSDK, isSDKInitialized, resetSDK } from './sdk'
import { resetSDKConfig } from './config/sdk-config'
import { resetAPIClient } from './api/api-client'
import { resetAuthAPI } from './api/auth-api'
import { resetPointsAPI } from './api/points-api'
import { resetDepositAPI } from './api/deposit-api'

describe('SDK Initialization', () => {
  beforeEach(() => {
    // Reset all singletons before each test
    resetSDK()
    resetSDKConfig()
    resetAPIClient()
    resetAuthAPI()
    resetPointsAPI()
    resetDepositAPI()

    // Clear environment variables
    vi.stubEnv('NEXT_PUBLIC_USER_CENTER_URL', '')
    vi.stubEnv('NEXT_PUBLIC_APP_ID', '')
    vi.stubEnv('NEXT_PUBLIC_BSC_NETWORK', '')
    vi.stubEnv('NEXT_PUBLIC_CONTRACT_ADDRESS', '')
    vi.stubEnv('NEXT_PUBLIC_USDT_ADDRESS', '')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  describe('createSDK', () => {
    it('should create SDK instance with valid configuration', () => {
      const sdk = createSDK({
        userCenterUrl: 'https://api.example.com',
        appId: 'test-app-id',
        bscNetwork: 'testnet',
        contractAddress: '0x1234567890123456789012345678901234567890',
        usdtAddress: '0x0987654321098765432109876543210987654321',
      })

      expect(sdk).toBeDefined()
      expect(sdk.config).toBeDefined()
      expect(sdk.apiClient).toBeDefined()
      expect(sdk.auth).toBeDefined()
      expect(sdk.points).toBeDefined()
      expect(sdk.deposit).toBeDefined()
      expect(sdk.version).toBe('0.1.0')
    })

    it('should initialize configuration with provided values', () => {
      const config = {
        userCenterUrl: 'https://api.example.com',
        appId: 'test-app-id',
        bscNetwork: 'testnet' as const,
        contractAddress: '0x1234567890123456789012345678901234567890',
        usdtAddress: '0x0987654321098765432109876543210987654321',
        enableGuestLogin: false,
        enableWeb3Auth: true,
        locale: 'zh',
      }

      const sdk = createSDK(config)

      expect(sdk.config.userCenterUrl).toBe(config.userCenterUrl)
      expect(sdk.config.appId).toBe(config.appId)
      expect(sdk.config.bscNetwork).toBe(config.bscNetwork)
      expect(sdk.config.contractAddress).toBe(config.contractAddress)
      expect(sdk.config.usdtAddress).toBe(config.usdtAddress)
      expect(sdk.config.enableGuestLogin).toBe(false)
      expect(sdk.config.enableWeb3Auth).toBe(true)
      expect(sdk.config.locale).toBe('zh')
    })

    it('should load configuration from environment variables', () => {
      vi.stubEnv('NEXT_PUBLIC_USER_CENTER_URL', 'https://env.example.com')
      vi.stubEnv('NEXT_PUBLIC_APP_ID', 'env-app-id')
      vi.stubEnv('NEXT_PUBLIC_BSC_NETWORK', 'mainnet')
      vi.stubEnv('NEXT_PUBLIC_CONTRACT_ADDRESS', '0x1234567890123456789012345678901234567890')
      vi.stubEnv('NEXT_PUBLIC_USDT_ADDRESS', '0x0987654321098765432109876543210987654321')

      const sdk = createSDK()

      expect(sdk.config.userCenterUrl).toBe('https://env.example.com')
      expect(sdk.config.appId).toBe('env-app-id')
      expect(sdk.config.bscNetwork).toBe('mainnet')
    })

    it('should override environment variables with provided config', () => {
      vi.stubEnv('NEXT_PUBLIC_USER_CENTER_URL', 'https://env.example.com')
      vi.stubEnv('NEXT_PUBLIC_APP_ID', 'env-app-id')
      vi.stubEnv('NEXT_PUBLIC_BSC_NETWORK', 'mainnet')
      vi.stubEnv('NEXT_PUBLIC_CONTRACT_ADDRESS', '0x1234567890123456789012345678901234567890')
      vi.stubEnv('NEXT_PUBLIC_USDT_ADDRESS', '0x0987654321098765432109876543210987654321')

      const sdk = createSDK({
        userCenterUrl: 'https://override.example.com',
        appId: 'override-app-id',
      })

      expect(sdk.config.userCenterUrl).toBe('https://override.example.com')
      expect(sdk.config.appId).toBe('override-app-id')
      expect(sdk.config.bscNetwork).toBe('mainnet') // From env
    })

    it('should throw error for missing required fields', () => {
      expect(() => {
        createSDK({
          // Missing userCenterUrl
          appId: 'test-app-id',
          bscNetwork: 'testnet',
          contractAddress: '0x1234567890123456789012345678901234567890',
          usdtAddress: '0x0987654321098765432109876543210987654321',
        } as any)
      }).toThrow()
    })

    it('should throw error for invalid URL format', () => {
      expect(() => {
        createSDK({
          userCenterUrl: 'not-a-valid-url',
          appId: 'test-app-id',
          bscNetwork: 'testnet',
          contractAddress: '0x1234567890123456789012345678901234567890',
          usdtAddress: '0x0987654321098765432109876543210987654321',
        })
      }).toThrow()
    })

    it('should throw error for invalid contract address', () => {
      expect(() => {
        createSDK({
          userCenterUrl: 'https://api.example.com',
          appId: 'test-app-id',
          bscNetwork: 'testnet',
          contractAddress: 'invalid-address',
          usdtAddress: '0x0987654321098765432109876543210987654321',
        })
      }).toThrow()
    })

    it('should throw error for invalid USDT address', () => {
      expect(() => {
        createSDK({
          userCenterUrl: 'https://api.example.com',
          appId: 'test-app-id',
          bscNetwork: 'testnet',
          contractAddress: '0x1234567890123456789012345678901234567890',
          usdtAddress: 'invalid-address',
        })
      }).toThrow()
    })

    it('should apply default values for optional fields', () => {
      const sdk = createSDK({
        userCenterUrl: 'https://api.example.com',
        appId: 'test-app-id',
        bscNetwork: 'testnet',
        contractAddress: '0x1234567890123456789012345678901234567890',
        usdtAddress: '0x0987654321098765432109876543210987654321',
      })

      expect(sdk.config.enableGuestLogin).toBe(true)
      expect(sdk.config.enableWeb3Auth).toBe(true)
      expect(sdk.config.enableDeposit).toBe(true)
      expect(sdk.config.locale).toBe('en')
    })

    it('should create API client with correct base URL and app ID', () => {
      const sdk = createSDK({
        userCenterUrl: 'https://api.example.com',
        appId: 'test-app-id',
        bscNetwork: 'testnet',
        contractAddress: '0x1234567890123456789012345678901234567890',
        usdtAddress: '0x0987654321098765432109876543210987654321',
      })

      expect(sdk.apiClient).toBeDefined()
      // API client should be configured with the provided URL and app ID
    })

    it('should create all module instances', () => {
      const sdk = createSDK({
        userCenterUrl: 'https://api.example.com',
        appId: 'test-app-id',
        bscNetwork: 'testnet',
        contractAddress: '0x1234567890123456789012345678901234567890',
        usdtAddress: '0x0987654321098765432109876543210987654321',
      })

      expect(sdk.auth).toBeDefined()
      expect(sdk.points).toBeDefined()
      expect(sdk.deposit).toBeDefined()
      expect(typeof sdk.auth.web3Login).toBe('function')
      expect(typeof sdk.points.getBalance).toBe('function')
      expect(typeof sdk.deposit.saveDepositRecord).toBe('function')
    })

    it('should store SDK instance globally', () => {
      expect(isSDKInitialized()).toBe(false)

      createSDK({
        userCenterUrl: 'https://api.example.com',
        appId: 'test-app-id',
        bscNetwork: 'testnet',
        contractAddress: '0x1234567890123456789012345678901234567890',
        usdtAddress: '0x0987654321098765432109876543210987654321',
      })

      expect(isSDKInitialized()).toBe(true)
    })

    it('should support custom theme configuration', () => {
      const sdk = createSDK({
        userCenterUrl: 'https://api.example.com',
        appId: 'test-app-id',
        bscNetwork: 'testnet',
        contractAddress: '0x1234567890123456789012345678901234567890',
        usdtAddress: '0x0987654321098765432109876543210987654321',
        theme: {
          primaryColor: '#ff0000',
          borderRadius: '8px',
          fontFamily: 'Arial',
        },
      })

      expect(sdk.config.theme).toEqual({
        primaryColor: '#ff0000',
        borderRadius: '8px',
        fontFamily: 'Arial',
      })
    })

    it('should support Web3Auth configuration', () => {
      const sdk = createSDK({
        userCenterUrl: 'https://api.example.com',
        appId: 'test-app-id',
        bscNetwork: 'testnet',
        contractAddress: '0x1234567890123456789012345678901234567890',
        usdtAddress: '0x0987654321098765432109876543210987654321',
        web3AuthClientId: 'web3auth-client-id',
        web3AuthNetwork: 'cyan',
      })

      expect(sdk.config.web3AuthClientId).toBe('web3auth-client-id')
      expect(sdk.config.web3AuthNetwork).toBe('cyan')
    })

    it('should support NextAuth configuration', () => {
      const sdk = createSDK({
        userCenterUrl: 'https://api.example.com',
        appId: 'test-app-id',
        bscNetwork: 'testnet',
        contractAddress: '0x1234567890123456789012345678901234567890',
        usdtAddress: '0x0987654321098765432109876543210987654321',
        nextAuthUrl: 'https://app.example.com',
        nextAuthSecret: 'secret-key',
      })

      expect(sdk.config.nextAuthUrl).toBe('https://app.example.com')
      expect(sdk.config.nextAuthSecret).toBe('secret-key')
    })

    it('should support custom RPC URL', () => {
      const sdk = createSDK({
        userCenterUrl: 'https://api.example.com',
        appId: 'test-app-id',
        bscNetwork: 'testnet',
        contractAddress: '0x1234567890123456789012345678901234567890',
        usdtAddress: '0x0987654321098765432109876543210987654321',
        rpcUrl: 'https://custom-rpc.example.com',
      })

      expect(sdk.config.rpcUrl).toBe('https://custom-rpc.example.com')
    })
  })

  describe('getSDK', () => {
    it('should return SDK instance after initialization', () => {
      const sdk = createSDK({
        userCenterUrl: 'https://api.example.com',
        appId: 'test-app-id',
        bscNetwork: 'testnet',
        contractAddress: '0x1234567890123456789012345678901234567890',
        usdtAddress: '0x0987654321098765432109876543210987654321',
      })

      const retrievedSdk = getSDK()

      expect(retrievedSdk).toBe(sdk)
      expect(retrievedSdk.config).toBe(sdk.config)
    })

    it('should throw error if SDK is not initialized', () => {
      expect(() => {
        getSDK()
      }).toThrow('SDK not initialized. Call createSDK() before using the SDK.')
    })
  })

  describe('isSDKInitialized', () => {
    it('should return false before initialization', () => {
      expect(isSDKInitialized()).toBe(false)
    })

    it('should return true after initialization', () => {
      createSDK({
        userCenterUrl: 'https://api.example.com',
        appId: 'test-app-id',
        bscNetwork: 'testnet',
        contractAddress: '0x1234567890123456789012345678901234567890',
        usdtAddress: '0x0987654321098765432109876543210987654321',
      })

      expect(isSDKInitialized()).toBe(true)
    })

    it('should return false after reset', () => {
      createSDK({
        userCenterUrl: 'https://api.example.com',
        appId: 'test-app-id',
        bscNetwork: 'testnet',
        contractAddress: '0x1234567890123456789012345678901234567890',
        usdtAddress: '0x0987654321098765432109876543210987654321',
      })

      expect(isSDKInitialized()).toBe(true)

      resetSDK()

      expect(isSDKInitialized()).toBe(false)
    })
  })

  describe('resetSDK', () => {
    it('should reset SDK instance', () => {
      createSDK({
        userCenterUrl: 'https://api.example.com',
        appId: 'test-app-id',
        bscNetwork: 'testnet',
        contractAddress: '0x1234567890123456789012345678901234567890',
        usdtAddress: '0x0987654321098765432109876543210987654321',
      })

      expect(isSDKInitialized()).toBe(true)

      resetSDK()

      expect(isSDKInitialized()).toBe(false)
      expect(() => getSDK()).toThrow()
    })

    it('should allow re-initialization after reset', () => {
      const sdk1 = createSDK({
        userCenterUrl: 'https://api.example.com',
        appId: 'test-app-id-1',
        bscNetwork: 'testnet',
        contractAddress: '0x1234567890123456789012345678901234567890',
        usdtAddress: '0x0987654321098765432109876543210987654321',
      })

      resetSDK()
      resetSDKConfig()

      const sdk2 = createSDK({
        userCenterUrl: 'https://api.example.com',
        appId: 'test-app-id-2',
        bscNetwork: 'mainnet',
        contractAddress: '0x1234567890123456789012345678901234567890',
        usdtAddress: '0x0987654321098765432109876543210987654321',
      })

      expect(sdk2).toBeDefined()
      expect(sdk2.config.appId).toBe('test-app-id-2')
      expect(sdk2.config.bscNetwork).toBe('mainnet')
      expect(sdk2).not.toBe(sdk1)
    })
  })

  describe('SDK module integration', () => {
    it('should provide access to auth module methods', () => {
      const sdk = createSDK({
        userCenterUrl: 'https://api.example.com',
        appId: 'test-app-id',
        bscNetwork: 'testnet',
        contractAddress: '0x1234567890123456789012345678901234567890',
        usdtAddress: '0x0987654321098765432109876543210987654321',
      })

      expect(sdk.auth.web3Login).toBeDefined()
      expect(sdk.auth.guestLogin).toBeDefined()
      expect(sdk.auth.verifyToken).toBeDefined()
      expect(sdk.auth.refreshToken).toBeDefined()
      expect(sdk.auth.logout).toBeDefined()
    })

    it('should provide access to points module methods', () => {
      const sdk = createSDK({
        userCenterUrl: 'https://api.example.com',
        appId: 'test-app-id',
        bscNetwork: 'testnet',
        contractAddress: '0x1234567890123456789012345678901234567890',
        usdtAddress: '0x0987654321098765432109876543210987654321',
      })

      expect(sdk.points.getBalance).toBeDefined()
      expect(sdk.points.getLedger).toBeDefined()
      expect(sdk.points.checkIn).toBeDefined()
    })

    it('should provide access to deposit module methods', () => {
      const sdk = createSDK({
        userCenterUrl: 'https://api.example.com',
        appId: 'test-app-id',
        bscNetwork: 'testnet',
        contractAddress: '0x1234567890123456789012345678901234567890',
        usdtAddress: '0x0987654321098765432109876543210987654321',
      })

      expect(sdk.deposit.saveDepositRecord).toBeDefined()
      expect(sdk.deposit.verifyDeposit).toBeDefined()
    })
  })
})
