/**
 * User Center SDK for Next.js 14+
 * 
 * Provides authentication (NextAuth + Web3Auth), points management,
 * and on-chain payment functionality for Next.js applications.
 */

// SDK Initialization
export {
  createSDK,
  getSDK,
  isSDKInitialized,
  resetSDK,
  type SDK,
} from './sdk'

// Configuration
export * from './config'

// Types
export * from './types'

// API Client
export * from './api'

// Auth module
export * from './auth'

// Points module
export * from './points'

// Deposit module
export * from './deposit'

// Hooks
export * from './hooks'

// Components
export * from './components'

// Error Handling Utilities
export {
  SDKError,
  NetworkError,
  TimeoutError,
  WalletError,
  UserRejectionError,
  InsufficientBalanceError,
  AuthenticationError,
  APIError as APIClientError, // Rename to avoid conflict with types/api.ts
  withRetry,
  withTimeout,
  isNetworkError,
  isTimeoutError,
  isUserRejectionError,
  isInsufficientBalanceError,
  normalizeError,
  type RetryOptions,
  DEFAULT_RETRY_OPTIONS
} from './utils/error-handling'
export * from './utils/error-messages'

/**
 * SDK version
 */
export const SDK_VERSION = '0.1.0'
