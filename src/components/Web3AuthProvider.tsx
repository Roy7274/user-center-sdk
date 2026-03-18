'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { Web3Auth } from '@web3auth/modal'
import { CHAIN_NAMESPACES, IProvider, WEB3AUTH_NETWORK } from '@web3auth/base'
import { EthereumPrivateKeyProvider } from '@web3auth/ethereum-provider'
import type { Web3AuthUserInfo } from '../types/auth'
import { getSDKConfig } from '../config/sdk-config'
import { BSC_CHAIN_CONFIG } from '../config/types'

/**
 * Web3Auth configuration interface
 */
export interface Web3AuthConfig {
  clientId: string
  network: 'mainnet' | 'testnet' | 'cyan'
  chainConfig: {
    chainNamespace: 'eip155'
    chainId: string
    rpcTarget: string
    displayName: string
    blockExplorer: string
    ticker: string
    tickerName: string
  }
}

/**
 * Web3Auth context value interface
 */
export interface Web3AuthContextValue {
  isConnected: boolean
  userInfo: Web3AuthUserInfo | null
  walletAddress: string | null
  provider: IProvider | null
  connect: () => Promise<void>
  disconnect: () => Promise<void>
  getAccounts: () => Promise<string[]>
  signMessage: (message: string) => Promise<string>
}

/**
 * Web3AuthProvider props interface
 */
export interface Web3AuthProviderProps {
  children: React.ReactNode
  config?: Partial<Web3AuthConfig>
}

// Create context
const Web3AuthContext = createContext<Web3AuthContextValue | undefined>(undefined)

/**
 * Web3AuthProvider component
 * Manages Web3Auth modal initialization and connection state
 */
export function Web3AuthProvider({ children, config: customConfig }: Web3AuthProviderProps) {
  const [web3auth, setWeb3auth] = useState<Web3Auth | null>(null)
  const [provider, setProvider] = useState<IProvider | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [userInfo, setUserInfo] = useState<Web3AuthUserInfo | null>(null)
  const [walletAddress, setWalletAddress] = useState<string | null>(null)

  // Helper function to get accounts from provider
  const getAccountsFromProvider = async (provider: IProvider): Promise<string[]> => {
    try {
      const accounts = await provider.request<never, string[]>({
        method: 'eth_accounts',
      })
      return (accounts || []).filter((account): account is string => typeof account === 'string')
    } catch (error) {
      console.error('Error getting accounts:', error)
      return []
    }
  }

  // Disconnect from Web3Auth
  const disconnect = useCallback(async () => {
    if (!web3auth) {
      throw new Error('Web3Auth is not initialized')
    }

    try {
      await web3auth.logout()
      setProvider(null)
      setIsConnected(false)
      setUserInfo(null)
      setWalletAddress(null)
    } catch (error) {
      console.error('Error disconnecting from Web3Auth:', error)
      throw error
    }
  }, [web3auth])

  // Initialize Web3Auth
  useEffect(() => {
    const init = async () => {
      try {
        const sdkConfig = getSDKConfig()
        
        // Check if Web3Auth is enabled
        if (!sdkConfig.enableWeb3Auth) {
          console.log('Web3Auth is disabled in SDK configuration')
          return
        }

        // Validate required configuration
        if (!sdkConfig.web3AuthClientId) {
          console.error('Web3Auth client ID is not configured')
          return
        }

        // Get chain configuration
        const chainConfig = BSC_CHAIN_CONFIG[sdkConfig.bscNetwork]
        
        // Build Web3Auth configuration
        const web3AuthConfig: Web3AuthConfig = {
          clientId: sdkConfig.web3AuthClientId,
          network: sdkConfig.web3AuthNetwork || 'testnet',
          chainConfig: {
            chainNamespace: CHAIN_NAMESPACES.EIP155,
            chainId: chainConfig.chainIdHex,
            rpcTarget: sdkConfig.rpcUrl || chainConfig.rpcUrl,
            displayName: chainConfig.name,
            blockExplorer: chainConfig.blockExplorer,
            ticker: chainConfig.nativeCurrency.symbol,
            tickerName: chainConfig.nativeCurrency.name,
          },
          ...customConfig,
        }

        // Initialize Ethereum provider
        const privateKeyProvider = new EthereumPrivateKeyProvider({
          config: {
            chainConfig: web3AuthConfig.chainConfig,
          },
        })

        // Initialize Web3Auth modal
        const web3authInstance = new Web3Auth({
          clientId: web3AuthConfig.clientId,
          web3AuthNetwork: WEB3AUTH_NETWORK[web3AuthConfig.network.toUpperCase() as keyof typeof WEB3AUTH_NETWORK],
          privateKeyProvider,
          chainConfig: web3AuthConfig.chainConfig,
        })

        await web3authInstance.initModal()
        setWeb3auth(web3authInstance)

        // Check if already connected
        if (web3authInstance.connected) {
          setProvider(web3authInstance.provider)
          setIsConnected(true)
          
          // Get user info
          const info = await web3authInstance.getUserInfo()
          setUserInfo(info as Web3AuthUserInfo)
          
          // Get wallet address
          if (web3authInstance.provider) {
            const accounts = await getAccountsFromProvider(web3authInstance.provider)
            if (accounts.length > 0) {
              setWalletAddress(accounts[0])
            }
          }
        }
      } catch (error) {
        console.error('Error initializing Web3Auth:', error)
      }
    }

    init()
  }, [customConfig])

  // Handle provider state changes (account switching, disconnection)
  useEffect(() => {
    if (!provider || !isConnected) {
      return
    }

    const handleAccountsChanged = async (_accounts: unknown) => {
      console.log('Accounts changed, auto-disconnecting...')
      
      // Auto-disconnect on account change
      try {
        await disconnect()
      } catch (error) {
        console.error('Error during auto-disconnect:', error)
      }
    }

    const handleDisconnect = () => {
      console.log('Provider disconnected')
      setProvider(null)
      setIsConnected(false)
      setUserInfo(null)
      setWalletAddress(null)
    }

    // Listen for account changes
    try {
      provider.on('accountsChanged', handleAccountsChanged)
      provider.on('disconnect', handleDisconnect)
    } catch (error) {
      // Provider might not support event listeners
      console.warn('Provider does not support event listeners:', error)
    }

    // Cleanup event listeners
    return () => {
      try {
        provider.removeListener?.('accountsChanged', handleAccountsChanged)
        provider.removeListener?.('disconnect', handleDisconnect)
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  }, [provider, isConnected, disconnect])

  // Connect to Web3Auth
  const connect = useCallback(async () => {
    if (!web3auth) {
      throw new Error('Web3Auth is not initialized')
    }

    try {
      const web3authProvider = await web3auth.connect()
      
      if (!web3authProvider) {
        throw new Error('Failed to connect to Web3Auth')
      }

      setProvider(web3authProvider)
      setIsConnected(true)

      // Get user info
      const info = await web3auth.getUserInfo()
      setUserInfo(info as Web3AuthUserInfo)

      // Get wallet address
      const accounts = await getAccountsFromProvider(web3authProvider)
      if (accounts.length > 0) {
        setWalletAddress(accounts[0])
      }
    } catch (error) {
      console.error('Error connecting to Web3Auth:', error)
      throw error
    }
  }, [web3auth])

  // Get wallet accounts
  const getAccounts = useCallback(async (): Promise<string[]> => {
    if (!provider) {
      throw new Error('Provider is not available')
    }

    return getAccountsFromProvider(provider)
  }, [provider])

  // Sign message
  const signMessage = useCallback(async (message: string): Promise<string> => {
    if (!provider) {
      throw new Error('Provider is not available')
    }

    if (!walletAddress) {
      throw new Error('Wallet address is not available')
    }

    try {
      const signature = await provider.request<[string, string], string>({
        method: 'personal_sign',
        params: [message, walletAddress],
      })

      if (!signature) {
        throw new Error('Failed to sign message')
      }

      return signature
    } catch (error) {
      console.error('Error signing message:', error)
      throw error
    }
  }, [provider, walletAddress])

  const contextValue: Web3AuthContextValue = {
    isConnected,
    userInfo,
    walletAddress,
    provider,
    connect,
    disconnect,
    getAccounts,
    signMessage,
  }

  return (
    <Web3AuthContext.Provider value={contextValue}>
      {children}
    </Web3AuthContext.Provider>
  )
}

/**
 * Hook to access Web3Auth context
 */
export function useWeb3Auth(): Web3AuthContextValue {
  const context = useContext(Web3AuthContext)
  
  if (context === undefined) {
    throw new Error('useWeb3Auth must be used within a Web3AuthProvider')
  }
  
  return context
}
