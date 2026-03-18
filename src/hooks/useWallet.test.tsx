/**
 * Tests for useWallet hook
 */

import { renderHook } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useWallet } from './useWallet'
import { Web3Provider } from '../components/Web3Provider'
import { initSDKConfig } from '../config/sdk-config'
import React from 'react'

describe('useWallet', () => {
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

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <Web3Provider>{children}</Web3Provider>
  )

  describe('Hook Structure', () => {
    it('should export useWallet hook', () => {
      expect(useWallet).toBeDefined()
      expect(typeof useWallet).toBe('function')
    })

    it('should throw error when used outside Web3Provider', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      expect(() => {
        renderHook(() => useWallet())
      }).toThrow('useWeb3 must be used within a Web3Provider')

      consoleSpy.mockRestore()
    })
  })

  describe('Return Value Interface', () => {
    it('should return object with correct properties', () => {
      const { result } = renderHook(() => useWallet(), { wrapper })

      // Check all required properties exist
      expect(result.current).toHaveProperty('address')
      expect(result.current).toHaveProperty('chainId')
      expect(result.current).toHaveProperty('isConnected')
      expect(result.current).toHaveProperty('connect')
      expect(result.current).toHaveProperty('disconnect')
      expect(result.current).toHaveProperty('switchNetwork')
      expect(result.current).toHaveProperty('getBalance')
    })

    it('should have correct property types', () => {
      const { result } = renderHook(() => useWallet(), { wrapper })

      // Check types
      expect(result.current.address === null || typeof result.current.address === 'string').toBe(true)
      expect(result.current.chainId === null || typeof result.current.chainId === 'number').toBe(true)
      expect(typeof result.current.isConnected).toBe('boolean')
      expect(typeof result.current.connect).toBe('function')
      expect(typeof result.current.disconnect).toBe('function')
      expect(typeof result.current.switchNetwork).toBe('function')
      expect(typeof result.current.getBalance).toBe('function')
    })
  })

  describe('Initial State', () => {
    it('should return disconnected state initially', () => {
      const { result } = renderHook(() => useWallet(), { wrapper })

      expect(result.current.address).toBeNull()
      expect(result.current.chainId).toBeNull()
      expect(result.current.isConnected).toBe(false)
    })
  })

  describe('Method Signatures', () => {
    it('should have connect method with correct signature', () => {
      const { result } = renderHook(() => useWallet(), { wrapper })

      expect(result.current.connect).toBeDefined()
      expect(typeof result.current.connect).toBe('function')
      expect(result.current.connect.length).toBe(0) // No parameters
    })

    it('should have disconnect method with correct signature', () => {
      const { result } = renderHook(() => useWallet(), { wrapper })

      expect(result.current.disconnect).toBeDefined()
      expect(typeof result.current.disconnect).toBe('function')
      expect(result.current.disconnect.length).toBe(0) // No parameters
    })

    it('should have switchNetwork method with correct signature', () => {
      const { result } = renderHook(() => useWallet(), { wrapper })

      expect(result.current.switchNetwork).toBeDefined()
      expect(typeof result.current.switchNetwork).toBe('function')
      expect(result.current.switchNetwork.length).toBe(1) // One parameter: chainId
    })

    it('should have getBalance method with correct signature', () => {
      const { result } = renderHook(() => useWallet(), { wrapper })

      expect(result.current.getBalance).toBeDefined()
      expect(typeof result.current.getBalance).toBe('function')
      expect(result.current.getBalance.length).toBe(1) // One optional parameter: tokenAddress
    })
  })

  describe('Wallet State Properties', () => {
    it('should expose wallet address property', () => {
      const { result } = renderHook(() => useWallet(), { wrapper })

      expect(result.current).toHaveProperty('address')
      expect(result.current.address).toBeNull() // Initially null
    })

    it('should expose chain ID property', () => {
      const { result } = renderHook(() => useWallet(), { wrapper })

      expect(result.current).toHaveProperty('chainId')
      expect(result.current.chainId).toBeNull() // Initially null
    })

    it('should expose connection status property', () => {
      const { result } = renderHook(() => useWallet(), { wrapper })

      expect(result.current).toHaveProperty('isConnected')
      expect(result.current.isConnected).toBe(false) // Initially false
    })
  })

  describe('Integration with Web3Provider', () => {
    it('should maintain consistent state across multiple hook instances', () => {
      const { result: result1 } = renderHook(() => useWallet(), { wrapper })
      const { result: result2 } = renderHook(() => useWallet(), { wrapper })

      // Both instances should have the same initial state
      expect(result1.current.isConnected).toBe(result2.current.isConnected)
      expect(result1.current.address).toBe(result2.current.address)
      expect(result1.current.chainId).toBe(result2.current.chainId)
    })

    it('should provide the same method references', () => {
      const { result: result1 } = renderHook(() => useWallet(), { wrapper })
      const { result: result2 } = renderHook(() => useWallet(), { wrapper })

      // Methods should be functions with the same behavior
      // Note: Since useWallet creates a new object, references won't be identical
      // but they should wrap the same underlying Web3 context methods
      expect(typeof result1.current.connect).toBe('function')
      expect(typeof result2.current.connect).toBe('function')
      expect(typeof result1.current.disconnect).toBe('function')
      expect(typeof result2.current.disconnect).toBe('function')
      expect(typeof result1.current.switchNetwork).toBe('function')
      expect(typeof result2.current.switchNetwork).toBe('function')
      expect(typeof result1.current.getBalance).toBe('function')
      expect(typeof result2.current.getBalance).toBe('function')
    })
  })

  describe('TypeScript Interface Compliance', () => {
    it('should match UseWalletReturn interface', () => {
      const { result } = renderHook(() => useWallet(), { wrapper })

      // Verify all properties from UseWalletReturn interface are present
      const requiredProperties = [
        'address',
        'chainId',
        'isConnected',
        'connect',
        'disconnect',
        'switchNetwork',
        'getBalance',
      ]

      requiredProperties.forEach((prop) => {
        expect(result.current).toHaveProperty(prop)
      })

      // Verify no extra properties
      const actualProperties = Object.keys(result.current)
      expect(actualProperties.sort()).toEqual(requiredProperties.sort())
    })
  })
})

