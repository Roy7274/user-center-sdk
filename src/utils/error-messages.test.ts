/**
 * Error Messages Utilities Tests
 */

import { describe, it, expect } from 'vitest'
import {
  getErrorMessage,
  formatErrorMessage,
  getErrorSeverity,
  getErrorAction,
  shouldRetryError,
  requiresUserAction,
  API_ERROR_MESSAGES,
  WALLET_ERROR_MESSAGES,
  GENERIC_ERROR_MESSAGES
} from './error-messages'
import {
  SDKError,
  APIError,
  NetworkError,
  TimeoutError,
  UserRejectionError,
  InsufficientBalanceError,
  AuthenticationError,
  WalletError
} from './error-handling'

describe('getErrorMessage', () => {
  it('should return API error message for known API error code', () => {
    const error = new APIError('Invalid token', 'AUTH_INVALID_TOKEN', 401)
    const message = getErrorMessage(error)
    
    expect(message).toEqual(API_ERROR_MESSAGES['AUTH_INVALID_TOKEN'])
    expect(message.title).toBe('Authentication Failed')
    expect(message.severity).toBe('error')
  })

  it('should return wallet error message for known wallet error code', () => {
    const error = new WalletError('User cancelled', 'USER_REJECTION')
    const message = getErrorMessage(error)
    
    expect(message).toEqual(WALLET_ERROR_MESSAGES['USER_REJECTION'])
    expect(message.title).toBe('Transaction Cancelled')
    expect(message.severity).toBe('info')
  })

  it('should return specific message for UserRejectionError', () => {
    const error = new UserRejectionError()
    const message = getErrorMessage(error)
    
    expect(message).toEqual(WALLET_ERROR_MESSAGES['USER_REJECTION'])
  })

  it('should return specific message for InsufficientBalanceError', () => {
    const error = new InsufficientBalanceError()
    const message = getErrorMessage(error)
    
    expect(message).toEqual(WALLET_ERROR_MESSAGES['INSUFFICIENT_BALANCE'])
  })

  it('should return network error message for NetworkError', () => {
    const error = new NetworkError('Connection failed')
    const message = getErrorMessage(error)
    
    expect(message).toEqual(GENERIC_ERROR_MESSAGES['NETWORK_ERROR'])
  })

  it('should return timeout error message for TimeoutError', () => {
    const error = new TimeoutError('Request timeout', 5000)
    const message = getErrorMessage(error)
    
    expect(message).toEqual(GENERIC_ERROR_MESSAGES['TIMEOUT_ERROR'])
  })

  it('should return auth error message for AuthenticationError', () => {
    const error = new AuthenticationError('Token expired')
    const message = getErrorMessage(error)
    
    expect(message).toEqual(API_ERROR_MESSAGES['AUTH_INVALID_TOKEN'])
  })

  it('should handle HTTP status codes for API errors', () => {
    const error500 = new APIError('Server error', 'UNKNOWN', 500)
    expect(getErrorMessage(error500)).toEqual(API_ERROR_MESSAGES['INTERNAL_SERVER_ERROR'])
    
    const error429 = new APIError('Rate limited', 'UNKNOWN', 429)
    expect(getErrorMessage(error429)).toEqual(API_ERROR_MESSAGES['RATE_LIMIT_EXCEEDED'])
    
    const error401 = new APIError('Unauthorized', 'UNKNOWN', 401)
    expect(getErrorMessage(error401)).toEqual(API_ERROR_MESSAGES['AUTH_INVALID_TOKEN'])
    
    const error403 = new APIError('Forbidden', 'UNKNOWN', 403)
    expect(getErrorMessage(error403)).toEqual(API_ERROR_MESSAGES['AUTH_INSUFFICIENT_PERMISSIONS'])
  })

  it('should detect error patterns in message text', () => {
    const userRejectedError = new Error('user rejected the transaction')
    expect(getErrorMessage(userRejectedError)).toEqual(WALLET_ERROR_MESSAGES['USER_REJECTION'])
    
    const insufficientError = new Error('insufficient balance for gas')
    expect(getErrorMessage(insufficientError)).toEqual(WALLET_ERROR_MESSAGES['INSUFFICIENT_BALANCE'])
    
    const networkError = new Error('network connection failed')
    expect(getErrorMessage(networkError)).toEqual(GENERIC_ERROR_MESSAGES['NETWORK_ERROR'])
    
    const timeoutError = new Error('request timeout occurred')
    expect(getErrorMessage(timeoutError)).toEqual(GENERIC_ERROR_MESSAGES['TIMEOUT_ERROR'])
  })

  it('should return unknown error message for unrecognized errors', () => {
    const error = new Error('some random error')
    const message = getErrorMessage(error)
    
    expect(message).toEqual(GENERIC_ERROR_MESSAGES['UNKNOWN_ERROR'])
  })
})

describe('formatErrorMessage', () => {
  it('should format error message with title by default', () => {
    const error = new APIError('Invalid token', 'AUTH_INVALID_TOKEN', 401)
    const formatted = formatErrorMessage(error)
    
    expect(formatted).toBe('Authentication Failed: Your session has expired. Please log in again.')
  })

  it('should format error message without title when requested', () => {
    const error = new APIError('Invalid token', 'AUTH_INVALID_TOKEN', 401)
    const formatted = formatErrorMessage(error, false)
    
    expect(formatted).toBe('Your session has expired. Please log in again.')
  })
})

describe('getErrorSeverity', () => {
  it('should return correct severity for different error types', () => {
    const errorError = new APIError('Server error', 'INTERNAL_SERVER_ERROR', 500)
    expect(getErrorSeverity(errorError)).toBe('error')
    
    const warningError = new APIError('Rate limited', 'RATE_LIMIT_EXCEEDED', 429)
    expect(getErrorSeverity(warningError)).toBe('warning')
    
    const infoError = new UserRejectionError()
    expect(getErrorSeverity(infoError)).toBe('info')
  })
})

describe('getErrorAction', () => {
  it('should return action for errors that have one', () => {
    const error = new APIError('Invalid token', 'AUTH_INVALID_TOKEN', 401)
    const action = getErrorAction(error)
    
    expect(action).toBe('Log in')
  })

  it('should return undefined for errors without action', () => {
    const error = new APIError('Insufficient permissions', 'AUTH_INSUFFICIENT_PERMISSIONS', 403)
    const action = getErrorAction(error)
    
    expect(action).toBeUndefined()
  })
})

describe('shouldRetryError', () => {
  it('should return true for retryable errors', () => {
    expect(shouldRetryError(new NetworkError('Connection failed'))).toBe(true)
    expect(shouldRetryError(new TimeoutError('Timeout', 5000))).toBe(true)
    expect(shouldRetryError(new APIError('Server error', 'SERVER_ERROR', 500))).toBe(true)
    expect(shouldRetryError(new APIError('Rate limited', 'RATE_LIMITED', 429))).toBe(true)
  })

  it('should return false for non-retryable errors', () => {
    expect(shouldRetryError(new UserRejectionError())).toBe(false)
    expect(shouldRetryError(new APIError('Bad request', 'BAD_REQUEST', 400))).toBe(false)
    expect(shouldRetryError(new APIError('Unauthorized', 'UNAUTHORIZED', 401))).toBe(false)
    expect(shouldRetryError(new Error('Unknown error'))).toBe(false)
  })
})

describe('requiresUserAction', () => {
  it('should return false for user rejection (user already acted)', () => {
    expect(requiresUserAction(new UserRejectionError())).toBe(false)
  })

  it('should return true for authentication errors', () => {
    expect(requiresUserAction(new AuthenticationError('Token expired'))).toBe(true)
  })

  it('should return true for insufficient balance errors', () => {
    expect(requiresUserAction(new InsufficientBalanceError())).toBe(true)
  })

  it('should return true for errors with actions', () => {
    const error = new APIError('Invalid token', 'AUTH_INVALID_TOKEN', 401)
    expect(requiresUserAction(error)).toBe(true)
  })

  it('should return false for errors without actions', () => {
    // Use an error that maps to a message without action
    const error = new APIError('Insufficient permissions', 'AUTH_INSUFFICIENT_PERMISSIONS', 403)
    expect(requiresUserAction(error)).toBe(false)
  })
})

describe('Error Message Constants', () => {
  it('should have all required API error messages', () => {
    const requiredCodes = [
      'AUTH_INVALID_TOKEN',
      'AUTH_TOKEN_EXPIRED',
      'AUTH_INSUFFICIENT_PERMISSIONS',
      'USER_NOT_FOUND',
      'INVALID_CREDENTIALS',
      'INSUFFICIENT_POINTS',
      'CHECKIN_ALREADY_COMPLETED',
      'DEPOSIT_ALREADY_EXISTS',
      'DEPOSIT_FAILED',
      'VERIFICATION_TIMEOUT',
      'RATE_LIMIT_EXCEEDED',
      'INTERNAL_SERVER_ERROR',
      'SERVICE_UNAVAILABLE'
    ]
    
    requiredCodes.forEach(code => {
      expect(API_ERROR_MESSAGES[code]).toBeDefined()
      expect(API_ERROR_MESSAGES[code].title).toBeTruthy()
      expect(API_ERROR_MESSAGES[code].message).toBeTruthy()
      expect(['error', 'warning', 'info']).toContain(API_ERROR_MESSAGES[code].severity)
    })
  })

  it('should have all required wallet error messages', () => {
    const requiredCodes = [
      'USER_REJECTION',
      'INSUFFICIENT_BALANCE',
      'NETWORK_ERROR',
      'WALLET_NOT_CONNECTED',
      'WRONG_NETWORK',
      'TRANSACTION_FAILED'
    ]
    
    requiredCodes.forEach(code => {
      expect(WALLET_ERROR_MESSAGES[code]).toBeDefined()
      expect(WALLET_ERROR_MESSAGES[code].title).toBeTruthy()
      expect(WALLET_ERROR_MESSAGES[code].message).toBeTruthy()
      expect(['error', 'warning', 'info']).toContain(WALLET_ERROR_MESSAGES[code].severity)
    })
  })

  it('should have all required generic error messages', () => {
    const requiredCodes = [
      'NETWORK_ERROR',
      'TIMEOUT_ERROR',
      'UNKNOWN_ERROR'
    ]
    
    requiredCodes.forEach(code => {
      expect(GENERIC_ERROR_MESSAGES[code]).toBeDefined()
      expect(GENERIC_ERROR_MESSAGES[code].title).toBeTruthy()
      expect(GENERIC_ERROR_MESSAGES[code].message).toBeTruthy()
      expect(['error', 'warning', 'info']).toContain(GENERIC_ERROR_MESSAGES[code].severity)
    })
  })
})