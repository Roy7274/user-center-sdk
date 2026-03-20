/**
 * Error Handling Utilities
 * 
 * Provides comprehensive error handling utilities including:
 * - Custom error classes for different error types
 * - Retry logic with exponential backoff
 * - Network error detection and handling
 * - Timeout management
 * 
 * @module utils/error-handling
 */

/**
 * Base SDK error class
 */
export class SDKError extends Error {
  constructor(
    message: string,
    public code: string,
    public cause?: Error
  ) {
    super(message)
    this.name = 'SDKError'
  }
}

/**
 * Network-related error
 */
export class NetworkError extends SDKError {
  constructor(message: string, cause?: Error) {
    super(message, 'NETWORK_ERROR', cause)
    this.name = 'NetworkError'
  }
}

/**
 * Timeout error
 */
export class TimeoutError extends SDKError {
  constructor(message: string, public timeout: number) {
    super(message, 'TIMEOUT_ERROR')
    this.name = 'TimeoutError'
  }
}

/**
 * Wallet-related error
 */
export class WalletError extends SDKError {
  constructor(message: string, code: string, cause?: Error) {
    super(message, code, cause)
    this.name = 'WalletError'
  }
}

/**
 * User rejection error (when user cancels transaction)
 */
export class UserRejectionError extends WalletError {
  constructor(message: string = 'User rejected the transaction') {
    super(message, 'USER_REJECTION')
    this.name = 'UserRejectionError'
  }
}

/**
 * Insufficient balance error
 */
export class InsufficientBalanceError extends WalletError {
  constructor(message: string = 'Insufficient balance for transaction') {
    super(message, 'INSUFFICIENT_BALANCE')
    this.name = 'InsufficientBalanceError'
  }
}

/**
 * Authentication error
 */
export class AuthenticationError extends SDKError {
  constructor(message: string, code: string = 'AUTH_ERROR') {
    super(message, code)
    this.name = 'AuthenticationError'
  }
}

/**
 * API error (extends existing APIClientError functionality)
 */
export class APIError extends SDKError {
  constructor(
    message: string,
    code: string,
    public statusCode?: number,
    public details?: Record<string, any>
  ) {
    super(message, code)
    this.name = 'APIError'
  }
}

/**
 * Retry configuration options
 */
export interface RetryOptions {
  /** Maximum number of retry attempts */
  maxAttempts: number
  /** Initial delay in milliseconds */
  initialDelay: number
  /** Maximum delay in milliseconds */
  maxDelay: number
  /** Backoff multiplier */
  backoffMultiplier: number
  /** Jitter factor (0-1) to add randomness */
  jitter: number
  /** Function to determine if error should be retried */
  shouldRetry?: (error: Error, attempt: number) => boolean
}

/**
 * Default retry options
 */
export const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  jitter: 0.1,
  shouldRetry: (error: Error, _attempt: number) => {
    // Retry on network errors, timeouts, and 5xx server errors
    if (error instanceof NetworkError || error instanceof TimeoutError) {
      return true
    }
    
    if (error instanceof APIError) {
      // Retry on 5xx server errors and 429 rate limiting
      return error.statusCode ? error.statusCode >= 500 || error.statusCode === 429 : false
    }
    
    return false
  }
}

/**
 * Calculate delay with exponential backoff and jitter
 */
function calculateDelay(attempt: number, options: RetryOptions): number {
  const exponentialDelay = options.initialDelay * Math.pow(options.backoffMultiplier, attempt - 1)
  const cappedDelay = Math.min(exponentialDelay, options.maxDelay)
  
  // Add jitter to prevent thundering herd
  const jitterRange = cappedDelay * options.jitter
  const jitter = (Math.random() - 0.5) * 2 * jitterRange
  
  return Math.max(0, cappedDelay + jitter)
}

/**
 * Retry a function with exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const config = { ...DEFAULT_RETRY_OPTIONS, ...options }
  let lastError: Error
  
  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      
      // Don't retry if this is the last attempt
      if (attempt === config.maxAttempts) {
        break
      }
      
      // Check if we should retry this error
      if (!config.shouldRetry!(lastError, attempt)) {
        break
      }
      
      // Calculate delay and wait
      const delay = calculateDelay(attempt, config)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  throw lastError!
}

/**
 * Wrap a function with timeout
 */
export async function withTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  timeoutMessage?: string
): Promise<T> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  
  try {
    const result = await Promise.race([
      fn(),
      new Promise<never>((_, reject) => {
        controller.signal.addEventListener('abort', () => {
          reject(new TimeoutError(
            timeoutMessage || `Operation timed out after ${timeoutMs}ms`,
            timeoutMs
          ))
        })
      })
    ])
    
    clearTimeout(timeoutId)
    return result
  } catch (error) {
    clearTimeout(timeoutId)
    throw error
  }
}

/**
 * Detect if error is a network error
 */
export function isNetworkError(error: Error): boolean {
  return (
    error instanceof NetworkError ||
    error instanceof TypeError ||
    error.message.toLowerCase().includes('network') ||
    error.message.toLowerCase().includes('fetch')
  )
}

/**
 * Detect if error is a timeout error
 */
export function isTimeoutError(error: Error): boolean {
  return (
    error instanceof TimeoutError ||
    error.name === 'AbortError' ||
    error.message.toLowerCase().includes('timeout')
  )
}

/**
 * Detect if error is a user rejection
 */
export function isUserRejectionError(error: Error): boolean {
  const msg = error.message.toLowerCase()
  const code = (error as any).code
  return (
    error instanceof UserRejectionError ||
    code === 4001 ||
    code === 'ACTION_REJECTED' ||
    msg.includes('user rejected') ||
    msg.includes('user denied') ||
    msg.includes('user cancelled') ||
    msg.includes('action_rejected') ||
    msg.includes('ethers-user-denied')
  )
}

/**
 * Detect if error is insufficient balance
 */
export function isInsufficientBalanceError(error: Error): boolean {
  return (
    error instanceof InsufficientBalanceError ||
    error.message.toLowerCase().includes('insufficient') ||
    error.message.toLowerCase().includes('balance')
  )
}

/**
 * Convert generic error to appropriate SDK error type
 */
export function normalizeError(error: unknown): SDKError {
  if (error instanceof SDKError) {
    return error
  }
  
  if (!(error instanceof Error)) {
    return new SDKError(String(error), 'UNKNOWN_ERROR')
  }
  
  // Check for specific error patterns — use default friendly messages, not raw strings
  if (isUserRejectionError(error)) {
    return new UserRejectionError()
  }
  
  if (isInsufficientBalanceError(error)) {
    return new InsufficientBalanceError()
  }
  
  if (isNetworkError(error)) {
    return new NetworkError(error.message, error)
  }
  
  if (isTimeoutError(error)) {
    return new TimeoutError(error.message, 30000) // Default timeout
  }
  
  // Default to generic SDK error
  return new SDKError(error.message, 'UNKNOWN_ERROR', error)
}