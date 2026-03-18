# Error Handling System

The User Center SDK provides a comprehensive error handling system with automatic retry logic, user-friendly error messages, and notification components.

## Features

- **Custom Error Classes**: Structured error types for different scenarios
- **Retry Logic**: Exponential backoff with configurable options
- **User-Friendly Messages**: Automatic mapping from technical errors to user messages
- **Notification System**: Toast notifications with different severity levels
- **Error Boundary**: React error boundary for unhandled errors

## Error Classes

### Base Classes

```typescript
import { 
  SDKError,           // Base error class
  APIError,           // API-related errors
  NetworkError,       // Network connectivity issues
  TimeoutError,       // Request timeouts
  WalletError,        // Wallet-related errors
  UserRejectionError, // User cancelled transaction
  InsufficientBalanceError, // Insufficient funds
  AuthenticationError // Authentication failures
} from '@ai-agent/user-center-sdk'
```

### Error Properties

All SDK errors include:
- `message`: Human-readable error description
- `code`: Machine-readable error code
- `cause`: Original error (if wrapped)
- `statusCode`: HTTP status code (for API errors)
- `details`: Additional error context

## Retry Logic

### Basic Usage

```typescript
import { withRetry } from '@ai-agent/user-center-sdk'

const result = await withRetry(async () => {
  // Your async operation
  return await apiCall()
}, {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2
})
```

### Custom Retry Logic

```typescript
import { withRetry, NetworkError, APIError } from '@ai-agent/user-center-sdk'

const result = await withRetry(async () => {
  return await riskyOperation()
}, {
  maxAttempts: 5,
  shouldRetry: (error, attempt) => {
    // Only retry network errors and 5xx server errors
    if (error instanceof NetworkError) return true
    if (error instanceof APIError && error.statusCode >= 500) return true
    return false
  }
})
```

## User-Friendly Messages

### Getting Error Messages

```typescript
import { getErrorMessage, formatErrorMessage } from '@ai-agent/user-center-sdk'

try {
  await someOperation()
} catch (error) {
  // Get structured error message
  const errorMessage = getErrorMessage(error)
  console.log(errorMessage.title)    // "Connection Problem"
  console.log(errorMessage.message)  // "Unable to connect to server..."
  console.log(errorMessage.action)   // "Retry"
  console.log(errorMessage.severity) // "error"
  
  // Get formatted string
  const formatted = formatErrorMessage(error)
  console.log(formatted) // "Connection Problem: Unable to connect to server..."
}
```

### Error Message Types

The system provides three categories of error messages:

1. **API Error Messages**: For server-side errors
2. **Wallet Error Messages**: For blockchain/wallet errors  
3. **Generic Error Messages**: For network, timeout, and unknown errors

## Notification System

### Setup

```typescript
import { NotificationProvider } from '@ai-agent/user-center-sdk'

function App() {
  return (
    <NotificationProvider
      maxNotifications={5}
      autoDismissTimeout={5000}
      position="top-right"
    >
      {/* Your app content */}
    </NotificationProvider>
  )
}
```

### Using Error Handler

```typescript
import { useErrorHandler } from '@ai-agent/user-center-sdk'

function MyComponent() {
  const handleError = useErrorHandler()
  
  const doSomething = async () => {
    try {
      await riskyOperation()
    } catch (error) {
      // Automatically shows user-friendly notification
      handleError(error)
    }
  }
}
```

## Error Boundary

### Basic Usage

```typescript
import { ErrorBoundary } from '@ai-agent/user-center-sdk'

function App() {
  return (
    <ErrorBoundary>
      <MyComponent />
    </ErrorBoundary>
  )
}
```

### Custom Fallback

```typescript
import { ErrorBoundary } from '@ai-agent/user-center-sdk'

function ErrorFallback({ error, resetError }) {
  return (
    <div>
      <h2>Something went wrong</h2>
      <p>{error.message}</p>
      <button onClick={resetError}>Try Again</button>
    </div>
  )
}

function App() {
  return (
    <ErrorBoundary fallback={ErrorFallback}>
      <MyComponent />
    </ErrorBoundary>
  )
}
```

## Error Detection Utilities

```typescript
import { 
  isNetworkError,
  isTimeoutError,
  isUserRejectionError,
  isInsufficientBalanceError,
  normalizeError
} from '@ai-agent/user-center-sdk'

try {
  await operation()
} catch (error) {
  if (isUserRejectionError(error)) {
    // User cancelled - no need to show error
    return
  }
  
  if (isInsufficientBalanceError(error)) {
    // Show add funds dialog
    showAddFundsDialog()
    return
  }
  
  if (isNetworkError(error)) {
    // Maybe retry automatically
    setTimeout(() => retry(), 1000)
    return
  }
  
  // Convert to SDK error type
  const sdkError = normalizeError(error)
  handleError(sdkError)
}
```

## Integration with Hooks

The SDK hooks automatically use the error handling system:

```typescript
import { useDeposit } from '@ai-agent/user-center-sdk'

function DepositComponent() {
  const { deposit, error, isLoading } = useDeposit()
  
  // The error is already normalized to SDK error type
  if (error) {
    console.log(error.name)    // "UserRejectionError"
    console.log(error.code)    // "USER_REJECTION"
    console.log(error.message) // "User rejected the transaction"
  }
}
```

## Configuration

### Default Retry Options

```typescript
export const DEFAULT_RETRY_OPTIONS = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  jitter: 0.1
}
```

### Customizing Error Messages

You can extend the error message mappings:

```typescript
import { API_ERROR_MESSAGES } from '@ai-agent/user-center-sdk'

// Add custom error messages
API_ERROR_MESSAGES['CUSTOM_ERROR'] = {
  title: 'Custom Error',
  message: 'This is a custom error message',
  action: 'Contact Support',
  severity: 'error'
}
```

## Best Practices

1. **Always use error handlers**: Don't let errors go unhandled
2. **Provide user actions**: Include actionable suggestions in error messages
3. **Retry appropriately**: Only retry transient errors (network, server errors)
4. **Handle user rejections gracefully**: Don't show errors for user cancellations
5. **Use error boundaries**: Catch unhandled errors at component boundaries
6. **Log technical details**: Keep technical error info for debugging
7. **Test error scenarios**: Ensure error handling works in all failure modes

## Example Implementation

See `src/examples/error-handling-example.tsx` for a complete working example demonstrating all features of the error handling system.