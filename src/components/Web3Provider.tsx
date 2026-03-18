'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { BrowserProvider, Eip1193Provider, JsonRpcSigner } from 'ethers'
import { getSDKConfig } from '../config/sdk-config'
import { BSC_CHAIN_CONFIG } from '../config/types'

/**
 * Web3 wallet state interface
 */
export interface Web3WalletState {
  address: string | null
  chainId: number | null
  isConnected: boolean
  isConnecting: boolean
}

/**
 * Web3Provider context value interface
 */
export interface Web3ContextValue extends Web3WalletState {
  provider: BrowserProvider | null
  signer: JsonRpcSigner | null
  connect: () => Promise<void>
  disconnect: () => Promise<void>
  switchNetwork: (chainId: number) => Promise<void>
  getBalance: (tokenAddress?: string) => Promise<string>
}

/**
 * Web3Provider props interface
 */
export interface Web3ProviderProps {
  children: React.ReactNode
}

// Create context
const Web3Context = createContext<Web3ContextValue | undefined>(undefined)

/**
 * Web3Provider component
 * Manages ethers.js provider and wallet connection state
 */
export function Web3Provider({ children }: Web3ProviderProps) {
  const [provider, setProvider] = useState<BrowserProvider | null>(null)
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null)
  const [address, setAddress] = useState<string | null>(null)
  const [chainId, setChainId] = useState<number | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)

  /**
   * Get Ethereum provider from window
   */
  const getEthereumProvider = (): Eip1193Provider | null => {
    if (typeof window === 'undefined') {
      return null
    }

    // Check for MetaMask or other injected providers
    const ethereum = (window as any).ethereum as Eip1193Provider | undefined

    if (!ethereum) {
      console.warn('No Ethereum provider found. Please install MetaMask or another Web3 wallet.')
      return null
    }

    return ethereum
  }

  /**
   * Initialize provider and check for existing connection
   */
  useEffect(() => {
    const init = async () => {
      const ethereum = getEthereumProvider()
      if (!ethereum) {
        return
      }

      try {
        const browserProvider = new BrowserProvider(ethereum)
        setProvider(browserProvider)

        // Check if already connected
        const accounts = await ethereum.request({ method: 'eth_accounts' }) as string[]
        if (accounts && accounts.length > 0) {
          const signer = await browserProvider.getSigner()
          const address = await signer.getAddress()
          const network = await browserProvider.getNetwork()

          setSigner(signer)
          setAddress(address)
          setChainId(Number(network.chainId))
          setIsConnected(true)
        }
      } catch (error) {
        console.error('Error initializing Web3 provider:', error)
      }
    }

    init()
  }, [])

  /**
   * Handle account changes
   */
  const handleAccountsChanged = useCallback((accounts: string[]) => {
    if (accounts.length === 0) {
      // User disconnected wallet
      setSigner(null)
      setAddress(null)
      setIsConnected(false)
    } else if (accounts[0] !== address) {
      // User switched accounts
      setAddress(accounts[0])
      // Re-fetch signer
      if (provider) {
        provider.getSigner().then(setSigner).catch(console.error)
      }
    }
  }, [address, provider])

  /**
   * Handle chain changes
   */
  const handleChainChanged = useCallback((chainIdHex: string) => {
    const newChainId = parseInt(chainIdHex, 16)
    setChainId(newChainId)
    // Reload provider to ensure consistency
    window.location.reload()
  }, [])

  /**
   * Set up event listeners for wallet events
   */
  useEffect(() => {
    const ethereum = getEthereumProvider()
    if (!ethereum) {
      return
    }

    // Type assertion for event emitter methods
    const provider = ethereum as any

    provider.on?.('accountsChanged', handleAccountsChanged)
    provider.on?.('chainChanged', handleChainChanged)

    return () => {
      provider.removeListener?.('accountsChanged', handleAccountsChanged)
      provider.removeListener?.('chainChanged', handleChainChanged)
    }
  }, [handleAccountsChanged, handleChainChanged])

  /**
   * Connect wallet
   */
  const connect = useCallback(async () => {
    const ethereum = getEthereumProvider()
    if (!ethereum) {
      throw new Error('No Ethereum provider found. Please install MetaMask or another Web3 wallet.')
    }

    setIsConnecting(true)

    try {
      // Request account access
      const accounts = await ethereum.request({ 
        method: 'eth_requestAccounts' 
      }) as string[]

      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found')
      }

      const browserProvider = new BrowserProvider(ethereum)
      const signer = await browserProvider.getSigner()
      const address = await signer.getAddress()
      const network = await browserProvider.getNetwork()

      setProvider(browserProvider)
      setSigner(signer)
      setAddress(address)
      setChainId(Number(network.chainId))
      setIsConnected(true)

      // Auto-switch to BSC network
      const sdkConfig = getSDKConfig()
      const targetChainId = BSC_CHAIN_CONFIG[sdkConfig.bscNetwork].chainId
      
      if (Number(network.chainId) !== targetChainId) {
        await switchNetwork(targetChainId)
      }
    } catch (error) {
      console.error('Error connecting wallet:', error)
      throw error
    } finally {
      setIsConnecting(false)
    }
  }, [])

  /**
   * Disconnect wallet
   */
  const disconnect = useCallback(async () => {
    setProvider(null)
    setSigner(null)
    setAddress(null)
    setChainId(null)
    setIsConnected(false)
  }, [])

  /**
   * Switch to a different network
   */
  const switchNetwork = useCallback(async (targetChainId: number) => {
    const ethereum = getEthereumProvider()
    if (!ethereum) {
      throw new Error('No Ethereum provider found')
    }

    const chainIdHex = `0x${targetChainId.toString(16)}`

    try {
      // Try to switch to the network
      await ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: chainIdHex }],
      })
    } catch (error: any) {
      // This error code indicates that the chain has not been added to MetaMask
      if (error.code === 4902) {
        const sdkConfig = getSDKConfig()
        const chainConfig = BSC_CHAIN_CONFIG[sdkConfig.bscNetwork]

        try {
          await ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: chainIdHex,
                chainName: chainConfig.name,
                nativeCurrency: chainConfig.nativeCurrency,
                rpcUrls: [sdkConfig.rpcUrl || chainConfig.rpcUrl],
                blockExplorerUrls: [chainConfig.blockExplorer],
              },
            ],
          })
        } catch (addError) {
          console.error('Error adding network:', addError)
          throw addError
        }
      } else {
        console.error('Error switching network:', error)
        throw error
      }
    }
  }, [])

  /**
   * Get balance for native token or ERC20 token
   */
  const getBalance = useCallback(async (tokenAddress?: string): Promise<string> => {
    if (!provider || !address) {
      throw new Error('Wallet not connected')
    }

    try {
      if (!tokenAddress) {
        // Get native token (BNB) balance
        const balance = await provider.getBalance(address)
        return balance.toString()
      } else {
        // Get ERC20 token balance
        const abi = [
          'function balanceOf(address owner) view returns (uint256)',
        ]
        const { Contract } = await import('ethers')
        const contract = new Contract(tokenAddress, abi, provider)
        const balance = await contract.balanceOf(address)
        return balance.toString()
      }
    } catch (error) {
      console.error('Error getting balance:', error)
      throw error
    }
  }, [provider, address])

  const contextValue: Web3ContextValue = {
    provider,
    signer,
    address,
    chainId,
    isConnected,
    isConnecting,
    connect,
    disconnect,
    switchNetwork,
    getBalance,
  }

  return (
    <Web3Context.Provider value={contextValue}>
      {children}
    </Web3Context.Provider>
  )
}

/**
 * Hook to access Web3 context
 */
export function useWeb3(): Web3ContextValue {
  const context = useContext(Web3Context)
  
  if (context === undefined) {
    throw new Error('useWeb3 must be used within a Web3Provider')
  }
  
  return context
}
