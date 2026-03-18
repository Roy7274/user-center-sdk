/**
 * Error Handling Utilities Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  SDKError,
  NetworkError,
  TimeoutError,
  WalletError,
  UserRejectionError,
  InsufficientBalanceError,
  AuthenticationError,
  APIError,
  withRetry,
  withTimeout,
  isNetworkError,
  isTimeoutError,
  isUserRejectionError,
  isInsufficientBalanceError,
  normalizeError,
  DEFAULT_RETRY_OPTIONS
} from './error-handling'

describe('Error Classes', () => {
  it('should create SDKError with correct properties', () => {
    const error = new SDKError('Test message', 'TEST_CODE')
    
    expect(error).toBeInstanceOf(Error)
    expect(error).toBeInstanceOf(SDKError)
    expect(error.name).toBe('SDKError')
    expect(error.message).toBe('Test message')
    expect(error.code).toBe('TEST_CODE')
    expect(error.cause).toBeUndefined()
  })

  it('should create NetworkError with correct properties', () => {
    const cause = new Error('Original error')
    const error = new NetworkError('Network failed', cause)
    
    expect(error).toBeInstanceOf(SDKError)
    expect(error).toBeInstanceOf(NetworkError)
    expect(error.name).toBe('NetworkError')
    expect(error.message).toBe('Network failed')
    expect(error.code).toBe('NETWORK_ERROR')
    expect(error.cause).toBe(cause)
  })

  it('should create TimeoutError with correct properties', () => {
    const error = new TimeoutError('Request timed out', 5000)
    
    expect(error).toBeInstanceOf(SDKError)
    expect(error).toBeInstanceOf(TimeoutError)
    expect(error.name).toBe('TimeoutError')
    expect(error.message).toBe('Request timed out')
    expect(error.code).toBe('TIMEOUT_ERROR')
    expect(error.timeout).toBe(5000)
  })

  it('should create UserRejectionError with default message', () => {
    const error = new UserRejectionError()
    
    expect(error).toBeInstanceOf(WalletError)
    expect(error).toBeInstanceOf(UserRejectionError)
    expect(error.name).toBe('UserRejectionError')
    expect(error.message).toBe('User rejected the transaction')
    expect(error.code).toBe('USER_REJECTION')
  })

  it('should create InsufficientBalanceError with default message', () => {
    const error = new InsufficientBalanceError()
    
    expect(error).toBeInstanceOf(WalletError)
    expect(error).toBeInstanceOf(InsufficientBalanceError)
    expect(error.name).toBe('InsufficientBalanceError')
    expect(error.message).toBe('Insufficient balance for transaction')
    expect(error.code).toBe('INSUFFICIENT_BALANCE')
  })

  it('should create APIError with status code and details', () => {
    const details = { field: 'value' }
    const error = new APIError('API failed', 'API_ERROR', 400, details)
    
    expect(error).toBeInstanceOf(SDKError)
    expect(error).toBeInstanceOf(APIError)
    expect(error.name).toBe('APIError')
    expect(error.message).toBe('API failed')
    expect(error.code).toBe('API_ERROR')
    expect(error.statusCode).toBe(400)
    expect(error.details).toBe(details)
  })
})

describe('withRetry', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should succeed on first attempt', async () => {
    const fn = vi.fn().mockResolvedValue('success')
    
    const result = await withRetry(fn)
    
    expect(result).toBe('success')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('should retry on network error', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new NetworkError('Network failed'))
      .mockResolvedValue('success')
    
    const promise = withRetry(fn, { maxAttempts: 2 })
    
    // Fast-forward through the delay
    await vi.runAllTimersAsync()
    
    const result = await promise
    
    expect(result).toBe('success')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('should retry on timeout error', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new TimeoutError('Timeout', 5000))
      .mockResolvedValue('success')
    
    const promise = withRetry(fn, { maxAttempts: 2 })
    
    await vi.runAllTimersAsync()
    
    const result = await promise
    
    expect(result).toBe('success')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('should not retry on user rejection error', async () => {
    const fn = vi.fn().mockRejectedValue(new UserRejectionError())
    
    await expect(withRetry(fn, { maxAttempts: 3 })).rejects.toThrow(UserRejectionError)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('should not retry on 4xx API errors', async () => {
    const fn = vi.fn().mockRejectedValue(new APIError('Bad request', 'BAD_REQUEST', 400))
    
    await expect(withRetry(fn, { maxAttempts: 3 })).rejects.toThrow(APIError)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('should retry on 5xx API errors', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new APIError('Server error', 'SERVER_ERROR', 500))
      .mockResolvedValue('success')
    
    const promise = withRetry(fn, { maxAttempts: 2 })
    
    await vi.runAllTimersAsync()
    
    const result = await promise
    
    expect(result).toBe('success')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('should respect maxAttempts', async () => {
    const fn = vi.fn().mockRejectedValue(new NetworkError('Network failed'))
    
    const promise = withRetry(fn, { maxAttempts: 2 })
    
    await vi.runAllTimersAsync()
    
    await expect(promise).rejects.toThrow(NetworkError)
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('should use custom shouldRetry function', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('Custom error'))
    const shouldRetry = vi.fn().mockReturnValue(true)
    
    const promise = withRetry(fn, { 
      maxAttempts: 2,
      shouldRetry
    })
    
    await vi.runAllTimersAsync()
    
    await expect(promise).rejects.toThrow('Custom error')
    expect(fn).toHaveBeenCalledTimes(2)
    expect(shouldRetry).toHaveBeenCalledWith(expect.any(Error), 1)
  })
})

describe('withTimeout', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should resolve if function completes within timeout', async () => {
    const fn = vi.fn().mockResolvedValue('success')
    
    const result = await withTimeout(fn, 5000)
    
    expect(result).toBe('success')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('should reject with TimeoutError if function takes too long', async () => {
    const fn = vi.fn().mockImplementation(() => new Promise(() => {})) // Never resolves
    
    const promise = withTimeout(fn, 1000)
    
    // Fast-forward past timeout
    vi.advanceTimersByTime(1001)
    
    await expect(promise).rejects.toThrow(TimeoutError)
    await expect(promise).rejects.toThrow('Operation timed out after 1000ms')
  })

  it('should use custom timeout message', async () => {
    const fn = vi.fn().mockImplementation(() => new Promise(() => {}))
    
    const promise = withTimeout(fn, 1000, 'Custom timeout message')
    
    vi.advanceTimersByTime(1001)
    
    await expect(promise).rejects.toThrow('Custom timeout message')
  })
})

describe('Error Detection Functions', () => {
  it('should detect network errors', () => {
    expect(isNetworkError(new NetworkError('Network failed'))).toBe(true)
    expect(isNetworkError(new TypeError('fetch failed'))).toBe(true)
    expect(isNetworkError(new Error('network connection failed'))).toBe(true)
    expect(isNetworkError(new Error('fetch error occurred'))).toBe(true)
    expect(isNetworkError(new Error('something else'))).toBe(false)
  })

  it('should detect timeout errors', () => {
    expect(isTimeoutError(new TimeoutError('Timeout', 5000))).toBe(true)
    
    const abortError = new Error('Request aborted')
    abortError.name = 'AbortError'
    expect(isTimeoutError(abortError)).toBe(true)
    
    expect(isTimeoutError(new Error('request timeout occurred'))).toBe(true)
    expect(isTimeoutError(new Error('something else'))).toBe(false)
  })

  it('should detect user rejection errors', () => {
    expect(isUserRejectionError(new UserRejectionError())).toBe(true)
    expect(isUserRejectionError(new Error('user rejected transaction'))).toBe(true)
    expect(isUserRejectionError(new Error('user denied the request'))).toBe(true)
    expect(isUserRejectionError(new Error('user cancelled operation'))).toBe(true)
    expect(isUserRejectionError(new Error('something else'))).toBe(false)
  })

  it('should detect insufficient balance errors', () => {
    expect(isInsufficientBalanceError(new InsufficientBalanceError())).toBe(true)
    expect(isInsufficientBalanceError(new Error('insufficient funds'))).toBe(true)
    expect(isInsufficientBalanceError(new Error('balance too low'))).toBe(true)
    expect(isInsufficientBalanceError(new Error('something else'))).toBe(false)
  })
})

describe('normalizeError', () => {
  it('should return SDKError as-is', () => {
    const error = new SDKError('Test', 'TEST')
    expect(normalizeError(error)).toBe(error)
  })

  it('should convert user rejection error', () => {
    const error = new Error('user rejected the transaction')
    const normalized = normalizeError(error)
    
    expect(normalized).toBeInstanceOf(UserRejectionError)
    expect(normalized.message).toBe('user rejected the transaction')
  })

  it('should convert insufficient balance error', () => {
    const error = new Error('insufficient funds for gas')
    const normalized = normalizeError(error)
    
    expect(normalized).toBeInstanceOf(InsufficientBalanceError)
    expect(normalized.message).toBe('insufficient funds for gas')
  })

  it('should convert network error', () => {
    const error = new TypeError('fetch failed')
    const normalized = normalizeError(error)
    
    expect(normalized).toBeInstanceOf(NetworkError)
    expect(normalized.message).toBe('fetch failed')
    expect(normalized.cause).toBe(error)
  })

  it('should convert timeout error', () => {
    const error = new Error('request timeout')
    const normalized = normalizeError(error)
    
    expect(normalized).toBeInstanceOf(TimeoutError)
    expect(normalized.message).toBe('request timeout')
  })

  it('should convert unknown error to SDKError', () => {
    const error = new Error('unknown error')
    const normalized = normalizeError(error)
    
    expect(normalized).toBeInstanceOf(SDKError)
    expect(normalized.message).toBe('unknown error')
    expect(normalized.code).toBe('UNKNOWN_ERROR')
    expect(normalized.cause).toBe(error)
  })

  it('should convert non-Error values', () => {
    const normalized = normalizeError('string error')
    
    expect(normalized).toBeInstanceOf(SDKError)
    expect(normalized.message).toBe('string error')
    expect(normalized.code).toBe('UNKNOWN_ERROR')
  })
})