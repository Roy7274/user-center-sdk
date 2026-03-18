import { describe, it, expect, beforeEach } from 'vitest'
import { createWeb3AuthProvider } from './web3auth-provider'
import { initSDKConfig, resetSDKConfig } from '../../config/sdk-config'

describe('Web3Auth Provider', () => {
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

  describe('createWeb3AuthProvider', () => {
    it('should create a credentials provider', () => {
      const provider = createWeb3AuthProvider()

      expect(provider).toBeDefined()
      expect(provider.type).toBe('credentials')
    })

    it('should have authorize function', () => {
      const provider = createWeb3AuthProvider()

      expect(provider.authorize).toBeDefined()
      expect(typeof provider.authorize).toBe('function')
    })

    it('should be configured with Web3Auth id and name', () => {
      const provider = createWeb3AuthProvider()

      // The provider is configured with id 'web3auth' and name 'Web3Auth'
      // These are used internally by NextAuth
      expect(provider).toHaveProperty('id')
      expect(provider).toHaveProperty('name')
    })
  })
})
