/**
 * User-Friendly Error Messages
 * 
 * Provides mapping from API error codes and technical errors to user-friendly messages.
 * Supports internationalization and customization.
 * 
 * @module utils/error-messages
 */

import { 
  SDKError, 
  APIError, 
  NetworkError, 
  TimeoutError, 
  WalletError,
  UserRejectionError,
  InsufficientBalanceError,
  AuthenticationError 
} from './error-handling'

/**
 * Error message configuration
 */
export interface ErrorMessage {
  title: string
  message: string
  action?: string
  severity: 'error' | 'warning' | 'info'
}

/**
 * Error message mapping for API error codes
 */
export const API_ERROR_MESSAGES: Record<string, ErrorMessage> = {
  // Authentication errors
  'AUTH_INVALID_TOKEN': {
    title: 'Authentication Failed',
    message: 'Your session has expired. Please log in again.',
    action: 'Log in',
    severity: 'error'
  },
  'AUTH_TOKEN_EXPIRED': {
    title: 'Session Expired',
    message: 'Your session has expired. Please log in again.',
    action: 'Log in',
    severity: 'warning'
  },
  'AUTH_INSUFFICIENT_PERMISSIONS': {
    title: 'Access Denied',
    message: 'You do not have permission to perform this action.',
    severity: 'error'
  },

  // User Center API errors
  'USER_NOT_FOUND': {
    title: 'User Not Found',
    message: 'The user account could not be found. Please check your credentials.',
    severity: 'error'
  },
  'INVALID_CREDENTIALS': {
    title: 'Invalid Credentials',
    message: 'The provided credentials are incorrect. Please try again.',
    action: 'Retry',
    severity: 'error'
  },
  'ACCOUNT_LOCKED': {
    title: 'Account Locked',
    message: 'Your account has been temporarily locked. Please contact support.',
    action: 'Contact Support',
    severity: 'error'
  },

  // Points API errors
  'INSUFFICIENT_POINTS': {
    title: 'Insufficient Points',
    message: 'You do not have enough points for this action.',
    action: 'Earn More Points',
    severity: 'warning'
  },
  'POINTS_EXPIRED': {
    title: 'Points Expired',
    message: 'Some of your points have expired and cannot be used.',
    severity: 'info'
  },
  'CHECKIN_ALREADY_COMPLETED': {
    title: 'Already Checked In',
    message: 'You have already checked in today. Come back tomorrow!',
    severity: 'info'
  },
  'CHECKIN_FAILED': {
    title: 'Check-in Failed',
    message: 'Unable to complete check-in. Please try again.',
    action: 'Retry',
    severity: 'error'
  },

  // Deposit API errors
  'DEPOSIT_ALREADY_EXISTS': {
    title: 'Deposit Already Recorded',
    message: 'This transaction has already been processed.',
    severity: 'info'
  },
  'DEPOSIT_FAILED': {
    title: 'Deposit Failed',
    message: 'The deposit transaction failed. Please check the transaction status.',
    action: 'Check Transaction',
    severity: 'error'
  },
  'VERIFICATION_TIMEOUT': {
    title: 'Verification Timeout',
    message: 'Transaction verification is taking longer than expected. Please check back later.',
    action: 'Check Status',
    severity: 'warning'
  },
  'INVALID_TRANSACTION': {
    title: 'Invalid Transaction',
    message: 'The transaction hash is invalid or not found on the blockchain.',
    severity: 'error'
  },

  // Rate limiting
  'RATE_LIMIT_EXCEEDED': {
    title: 'Too Many Requests',
    message: 'You are making requests too quickly. Please wait a moment and try again.',
    action: 'Wait and Retry',
    severity: 'warning'
  },

  // Server errors
  'INTERNAL_SERVER_ERROR': {
    title: 'Server Error',
    message: 'An internal server error occurred. Please try again later.',
    action: 'Retry Later',
    severity: 'error'
  },
  'SERVICE_UNAVAILABLE': {
    title: 'Service Unavailable',
    message: 'The service is temporarily unavailable. Please try again later.',
    action: 'Retry Later',
    severity: 'error'
  },
  'MAINTENANCE_MODE': {
    title: 'Maintenance in Progress',
    message: 'The service is currently under maintenance. Please try again later.',
    severity: 'info'
  }
}

/**
 * Error message mapping for wallet error codes
 */
export const WALLET_ERROR_MESSAGES: Record<string, ErrorMessage> = {
  'USER_REJECTION': {
    title: 'Transaction Cancelled',
    message: 'You cancelled the transaction. No funds were transferred.',
    severity: 'info'
  },
  'INSUFFICIENT_BALANCE': {
    title: 'Insufficient Balance',
    message: 'You do not have enough balance to complete this transaction.',
    action: 'Add Funds',
    severity: 'warning'
  },
  'NETWORK_ERROR': {
    title: 'Network Error',
    message: 'Unable to connect to the blockchain network. Please check your connection.',
    action: 'Retry',
    severity: 'error'
  },
  'WALLET_NOT_CONNECTED': {
    title: 'Wallet Not Connected',
    message: 'Please connect your wallet to continue.',
    action: 'Connect Wallet',
    severity: 'warning'
  },
  'WRONG_NETWORK': {
    title: 'Wrong Network',
    message: 'Please switch to the correct network in your wallet.',
    action: 'Switch Network',
    severity: 'warning'
  },
  'TRANSACTION_FAILED': {
    title: 'Transaction Failed',
    message: 'The transaction failed to execute. Please try again.',
    action: 'Retry',
    severity: 'error'
  },
  'GAS_ESTIMATION_FAILED': {
    title: 'Gas Estimation Failed',
    message: 'Unable to estimate transaction fees. Please try again.',
    action: 'Retry',
    severity: 'error'
  }
}

/**
 * Generic error messages for different error types
 */
export const GENERIC_ERROR_MESSAGES: Record<string, ErrorMessage> = {
  'NETWORK_ERROR': {
    title: 'Connection Problem',
    message: 'Unable to connect to the server. Please check your internet connection.',
    action: 'Retry',
    severity: 'error'
  },
  'TIMEOUT_ERROR': {
    title: 'Request Timeout',
    message: 'The request took too long to complete. Please try again.',
    action: 'Retry',
    severity: 'warning'
  },
  'UNKNOWN_ERROR': {
    title: 'Unexpected Error',
    message: 'An unexpected error occurred. Please try again.',
    action: 'Retry',
    severity: 'error'
  }
}

/**
 * Get user-friendly error message for any error
 */
export function getErrorMessage(error: Error | SDKError): ErrorMessage {
  // Handle specific SDK error types
  if (error instanceof APIError) {
    const apiMessage = API_ERROR_MESSAGES[error.code]
    if (apiMessage) {
      return apiMessage
    }
    
    // Handle HTTP status codes
    if (error.statusCode) {
      if (error.statusCode >= 500) {
        return API_ERROR_MESSAGES['INTERNAL_SERVER_ERROR']
      }
      if (error.statusCode === 429) {
        return API_ERROR_MESSAGES['RATE_LIMIT_EXCEEDED']
      }
      if (error.statusCode === 401) {
        return API_ERROR_MESSAGES['AUTH_INVALID_TOKEN']
      }
      if (error.statusCode === 403) {
        return API_ERROR_MESSAGES['AUTH_INSUFFICIENT_PERMISSIONS']
      }
    }
  }

  if (error instanceof WalletError) {
    const walletMessage = WALLET_ERROR_MESSAGES[error.code]
    if (walletMessage) {
      return walletMessage
    }
  }

  if (error instanceof UserRejectionError) {
    return WALLET_ERROR_MESSAGES['USER_REJECTION']
  }

  if (error instanceof InsufficientBalanceError) {
    return WALLET_ERROR_MESSAGES['INSUFFICIENT_BALANCE']
  }

  if (error instanceof NetworkError) {
    return GENERIC_ERROR_MESSAGES['NETWORK_ERROR']
  }

  if (error instanceof TimeoutError) {
    return GENERIC_ERROR_MESSAGES['TIMEOUT_ERROR']
  }

  if (error instanceof AuthenticationError) {
    return API_ERROR_MESSAGES['AUTH_INVALID_TOKEN']
  }

  // Check for specific error patterns in message
  const errorMessage = error.message.toLowerCase()
  
  if (errorMessage.includes('user rejected') || errorMessage.includes('user denied')) {
    return WALLET_ERROR_MESSAGES['USER_REJECTION']
  }
  
  if (errorMessage.includes('insufficient') || errorMessage.includes('balance')) {
    return WALLET_ERROR_MESSAGES['INSUFFICIENT_BALANCE']
  }
  
  if (errorMessage.includes('network') || errorMessage.includes('connection')) {
    return GENERIC_ERROR_MESSAGES['NETWORK_ERROR']
  }
  
  if (errorMessage.includes('timeout')) {
    return GENERIC_ERROR_MESSAGES['TIMEOUT_ERROR']
  }

  // Default fallback
  return GENERIC_ERROR_MESSAGES['UNKNOWN_ERROR']
}

/**
 * Format error message for display
 */
export function formatErrorMessage(error: Error | SDKError, includeTitle: boolean = true): string {
  const errorMessage = getErrorMessage(error)
  
  if (includeTitle) {
    return `${errorMessage.title}: ${errorMessage.message}`
  }
  
  return errorMessage.message
}

/**
 * Get error severity level
 */
export function getErrorSeverity(error: Error | SDKError): 'error' | 'warning' | 'info' {
  const errorMessage = getErrorMessage(error)
  return errorMessage.severity
}

/**
 * Get suggested action for error
 */
export function getErrorAction(error: Error | SDKError): string | undefined {
  const errorMessage = getErrorMessage(error)
  return errorMessage.action
}

/**
 * Check if error should be retried automatically
 */
export function shouldRetryError(error: Error | SDKError): boolean {
  if (error instanceof NetworkError || error instanceof TimeoutError) {
    return true
  }
  
  if (error instanceof APIError) {
    // Retry on 5xx server errors and 429 rate limiting
    return error.statusCode ? error.statusCode >= 500 || error.statusCode === 429 : false
  }
  
  return false
}

/**
 * Check if error requires user action
 */
export function requiresUserAction(error: Error | SDKError): boolean {
  if (error instanceof UserRejectionError) {
    return false // User already took action (cancelled)
  }
  
  if (error instanceof AuthenticationError) {
    return true // User needs to log in
  }
  
  if (error instanceof InsufficientBalanceError) {
    return true // User needs to add funds
  }
  
  const errorMessage = getErrorMessage(error)
  return !!errorMessage.action
}