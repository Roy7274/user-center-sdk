/**
 * SDK Initialization Module
 * 
 * Provides the main createSDK function for initializing the User Center SDK.
 * This is the primary entry point for applications using the SDK.
 * 
 * @module sdk
 */

import { initSDKConfig } from './config/sdk-config'
import type { SDKConfig } from './config/types'
import { createAuthAPI, type AuthAPI } from './api/auth-api'
import { createPointsAPI, type PointsAPI } from './api/points-api'
import { createDepositAPI, type DepositAPI } from './api/deposit-api'
import { createAPIClient, type APIClient } from './api/api-client'
import { initAuthIntegration } from './auth/integration'

/**
 * SDK Instance Interface
 * 
 * Provides access to all SDK modules and functionality
 */
export interface SDK {
  /**
   * SDK configuration
   */
  config: SDKConfig

  /**
   * Base API client for making authenticated requests
   */
  apiClient: APIClient

  /**
   * Authentication API module
   */
  auth: AuthAPI

  /**
   * Points management API module
   */
  points: PointsAPI

  /**
   * Deposit/payment API module
   */
  deposit: DepositAPI

  /**
   * SDK version
   */
  version: string
}

/**
 * Global SDK instance
 */
let sdkInstance: SDK | null = null

/**
 * Create and initialize the SDK
 * 
 * This is the main entry point for initializing the User Center SDK.
 * It loads configuration from environment variables and provided parameters,
 * validates the configuration, and returns an SDK instance with all modules.
 * 
 * @param config - Optional partial configuration to override environment variables
 * @returns Initialized SDK instance with all modules
 * 
 * @example
 * ```typescript
 * // Initialize with environment variables only
 * const sdk = createSDK()
 * 
 * // Initialize with custom configuration
 * const sdk = createSDK({
 *   userCenterUrl: 'https://api.example.com',
 *   appId: 'my-app-id',
 *   bscNetwork: 'testnet',
 *   contractAddress: '0x...',
 *   usdtAddress: '0x...',
 * })
 * 
 * // Access SDK modules
 * const balance = await sdk.points.getBalance()
 * const session = await sdk.auth.web3Login({ ... })
 * ```
 */
export function createSDK(config?: Partial<SDKConfig>): SDK {
  // Initialize and validate configuration
  const validatedConfig = initSDKConfig(config)

  // Initialize authentication integration
  initAuthIntegration()

  // Create API client instances
  const apiClient = createAPIClient()
  const auth = createAuthAPI()
  const points = createPointsAPI()
  const deposit = createDepositAPI()

  // Create SDK instance
  const sdk: SDK = {
    config: validatedConfig,
    apiClient,
    auth,
    points,
    deposit,
    version: '0.1.0',
  }

  // Store as global instance
  sdkInstance = sdk

  return sdk
}

/**
 * Get the current SDK instance
 * 
 * @throws Error if SDK is not initialized
 * @returns Current SDK instance
 * 
 * @example
 * ```typescript
 * const sdk = getSDK()
 * const balance = await sdk.points.getBalance()
 * ```
 */
export function getSDK(): SDK {
  if (!sdkInstance) {
    throw new Error(
      'SDK not initialized. Call createSDK() before using the SDK.'
    )
  }
  return sdkInstance
}

/**
 * Check if SDK is initialized
 * 
 * @returns True if SDK is initialized, false otherwise
 * 
 * @example
 * ```typescript
 * if (!isSDKInitialized()) {
 *   createSDK()
 * }
 * ```
 */
export function isSDKInitialized(): boolean {
  return sdkInstance !== null
}

/**
 * Reset SDK instance (mainly for testing)
 * 
 * @example
 * ```typescript
 * // In test cleanup
 * afterEach(() => {
 *   resetSDK()
 * })
 * ```
 */
export function resetSDK(): void {
  sdkInstance = null
}
