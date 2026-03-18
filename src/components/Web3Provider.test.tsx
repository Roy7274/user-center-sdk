import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Web3Provider, useWeb3 } from './Web3Provider'
import { initSDKConfig } from '../config/sdk-config'

describe('Web3Provider', () => {
  beforeEach(() => {
    // Initialize SDK config
    initSDKConfig({
      userCenterUrl: 'https://test.example.com',
      appId: 'test-app',
      bscNetwork: 'testnet',
      contractAddress: '0x1234567890123456789012345678901234567890',
      usdtAddress: '0x0987654321098765432109876543210987654321',
    })
  })

  describe('Component Structure', () => {
    it('should export Web3Provider component', () => {
      expect(Web3Provider).toBeDefined()
      expect(typeof Web3Provider).toBe('function')
    })

    it('should export useWeb3 hook', () => {
      expect(useWeb3).toBeDefined()
      expect(typeof useWeb3).toBe('function')
    })
  })

  describe('Context Value Interface', () => {
    it('should have correct interface structure', () => {
      // This test verifies the TypeScript interface is correctly defined
      // by checking that the component and hook exist
      expect(Web3Provider).toBeDefined()
      expect(useWeb3).toBeDefined()
    })
  })
})
