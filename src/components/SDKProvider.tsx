/**
 * SDKProvider Component
 * 
 * Root provider component that wraps all SDK providers and manages SDK initialization.
 * This component should be placed at the root of your Next.js application.
 * 
 * @module components/SDKProvider
 */

'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { SessionProvider } from 'next-auth/react'
import { Web3AuthProvider, type Web3AuthConfig } from './Web3AuthProvider'
import { Web3Provider } from './Web3Provider'
import { createSDK, getSDK, isSDKInitialized, type SDK } from '../sdk'
import type { SDKConfig } from '../config/types'
import { BSC_CHAIN_CONFIG } from '../config/types'

/**
 * SDKProvider Props
 */
export interface SDKProviderProps {
  /**
   * Child components
   */
  children: ReactNode

  /**
   * SDK configuration (optional, will use environment variables if not provided)
   */
  config?: Partial<SDKConfig>

  /**
   * NextAuth session (optional, for SSR)
   */
  session?: any

  /**
   * Custom error handler for initialization errors
   */
  onError?: (error: Error) => void

  /**
   * Loading component to show during initialization
   */
  loadingComponent?: ReactNode
}

/**
 * SDK Context Value
 */
export interface SDKContextValue {
  /**
   * SDK instance
   */
  sdk: SDK | null

  /**
   * Whether SDK is initialized
   */
  isInitialized: boolean

  /**
   * Initialization error if any
   */
  error: Error | null
}

/**
 * SDK Context
 */
const SDKContext = createContext<SDKContextValue | undefined>(undefined)

/**
 * Hook to access SDK instance
 * 
 * @returns SDK context value
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { sdk, isInitialized, error } = useSDK()
 *   
 *   if (!isInitialized) {
 *     return <div>Loading SDK...</div>
 *   }
 *   
 *   if (error) {
 *     return <div>Error: {error.message}</div>
 *   }
 *   
 *   // Use SDK
 *   const balance = await sdk.points.getBalance()
 * }
 * ```
 */
export function useSDK(): SDKContextValue {
  const context = useContext(SDKContext)
  if (context === undefined) {
    throw new Error('useSDK must be used within SDKProvider')
  }
  return context
}

/**
 * SDKProvider Component
 * 
 * Wraps SessionProvider, Web3AuthProvider, and Web3Provider to provide
 * complete SDK functionality to child components.
 * 
 * @example
 * ```tsx
 * // In your app layout or root component
 * import { SDKProvider } from '@ai-agent/user-center-sdk'
 * 
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         <SDKProvider
 *           config={{
 *             userCenterUrl: 'https://api.example.com',
 *             appId: 'my-app-id',
 *             bscNetwork: 'testnet',
 *             contractAddress: '0x...',
 *             usdtAddress: '0x...',
 *           }}
 *         >
 *           {children}
 *         </SDKProvider>
 *       </body>
 *     </html>
 *   )
 * }
 * ```
 * 
 * @example
 * ```tsx
 * // With custom error handling
 * <SDKProvider
 *   config={config}
 *   onError={(error) => {
 *     console.error('SDK initialization failed:', error)
 *     // Show toast notification
 *   }}
 *   loadingComponent={<div>Initializing SDK...</div>}
 * >
 *   {children}
 * </SDKProvider>
 * ```
 */
export function SDKProvider({
  children,
  config,
  session,
  onError,
  loadingComponent,
}: SDKProviderProps): JSX.Element {
  const [sdk, setSDK] = useState<SDK | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Initialize SDK on mount
  useEffect(() => {
    try {
      // Check if SDK is already initialized
      if (isSDKInitialized()) {
        const existingSDK = getSDK()
        setSDK(existingSDK)
        setIsInitialized(true)
        return
      }

      // Create new SDK instance
      const newSDK = createSDK(config)
      setSDK(newSDK)
      setIsInitialized(true)
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      setError(error)
      setIsInitialized(true) // Mark as initialized even on error
      onError?.(error)
    }
  }, [config, onError])

  // Show loading component during initialization
  if (!isInitialized && loadingComponent) {
    return <>{loadingComponent}</>
  }

  // Show error state if initialization failed
  if (error && !sdk) {
    return (
      <div role="alert" style={{ padding: '1rem', color: 'red' }}>
        <h3>SDK Initialization Error</h3>
        <p>{error.message}</p>
      </div>
    )
  }

  // Build Web3Auth configuration from SDK config
  const web3AuthConfig: Web3AuthConfig | undefined = sdk?.config.web3AuthClientId
    ? {
        clientId: sdk.config.web3AuthClientId,
        network: sdk.config.web3AuthNetwork || 'testnet',
        chainConfig: {
          chainNamespace: 'eip155',
          chainId: BSC_CHAIN_CONFIG[sdk.config.bscNetwork].chainIdHex,
          rpcTarget: sdk.config.rpcUrl || BSC_CHAIN_CONFIG[sdk.config.bscNetwork].rpcUrl,
          displayName: BSC_CHAIN_CONFIG[sdk.config.bscNetwork].name,
          blockExplorer: BSC_CHAIN_CONFIG[sdk.config.bscNetwork].blockExplorer,
          ticker: BSC_CHAIN_CONFIG[sdk.config.bscNetwork].nativeCurrency.symbol,
          tickerName: BSC_CHAIN_CONFIG[sdk.config.bscNetwork].nativeCurrency.name,
        },
      }
    : undefined

  return (
    <SDKContext.Provider value={{ sdk, isInitialized, error }}>
      <SessionProvider session={session}>
        {sdk?.config.enableWeb3Auth && web3AuthConfig ? (
          <Web3AuthProvider config={web3AuthConfig}>
            <Web3Provider>
              {children}
            </Web3Provider>
          </Web3AuthProvider>
        ) : (
          <Web3Provider>
            {children}
          </Web3Provider>
        )}
      </SessionProvider>
    </SDKContext.Provider>
  )
}
