# API Client

The API Client module provides a centralized HTTP client for making requests to the User Center API with automatic token injection, error handling, and token refresh capabilities.

## Features

- **Automatic Token Injection**: Automatically adds Bearer token to requests when authenticated
- **Token Refresh on 401**: Automatically refreshes expired tokens and retries failed requests
- **Error Handling**: Consistent error handling with custom `APIClientError` class
- **Response Parsing**: Handles both raw JSON and `APIResponse` wrapper formats
- **Request Timeout**: Configurable timeout with AbortController
- **Type Safety**: Full TypeScript support with generic response types

## Basic Usage

```typescript
import { getAPIClient } from '@ai-agent/user-center-sdk'

// Get the singleton API client instance
const client = getAPIClient()

// Make a GET request
const user = await client.get<UserInfo>('/users/me')

// Make a POST request
const result = await client.post('/auth/login', {
  email: 'user@example.com',
  password: 'password123'
})

// Make requests with query parameters
const users = await client.get('/users', {
  params: { page: 1, limit: 10 }
})
```

## Creating Custom Clients

```typescript
import { createAPIClient } from '@ai-agent/user-center-sdk'

// Create a client with custom base URL
const customClient = createAPIClient('https://custom-api.example.com', 'custom-app-id')

// Use the custom client
const data = await customClient.get('/endpoint')
```

## Token Management

The API client integrates with NextAuth for token management. You need to set up the token getter and refresh callback:

```typescript
import { setAccessTokenGetter, setTokenRefreshCallback } from '@ai-agent/user-center-sdk'
import { getSession } from 'next-auth/react'

// Set up token getter (called before each request)
setAccessTokenGetter(async () => {
  const session = await getSession()
  return session?.access_token || null
})

// Set up token refresh callback (called on 401 responses)
setTokenRefreshCallback(async () => {
  // Implement token refresh logic
  // Return new token or null if refresh fails
  const newSession = await refreshSession()
  return newSession?.access_token || null
})
```

## Error Handling

```typescript
import { APIClientError } from '@ai-agent/user-center-sdk'

try {
  const data = await client.get('/protected-endpoint')
} catch (error) {
  if (error instanceof APIClientError) {
    console.error('API Error:', error.message)
    console.error('Error Code:', error.code)
    console.error('Status Code:', error.statusCode)
    console.error('Details:', error.details)
  }
}
```

## Request Options

```typescript
interface APIRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  headers?: Record<string, string>
  body?: any
  params?: Record<string, string | number | boolean>
  timeout?: number  // in milliseconds, default: 30000
  retries?: number  // not yet implemented
}
```

## Convenience Methods

The API client provides convenience methods for common HTTP verbs:

```typescript
// GET request
await client.get<T>(endpoint, options)

// POST request
await client.post<T>(endpoint, body, options)

// PUT request
await client.put<T>(endpoint, body, options)

// PATCH request
await client.patch<T>(endpoint, body, options)

// DELETE request
await client.delete<T>(endpoint, options)
```

## Custom Headers

```typescript
const data = await client.get('/endpoint', {
  headers: {
    'X-Custom-Header': 'custom-value'
  }
})
```

## Response Format

The API client handles two response formats:

1. **Direct JSON**: Returns the JSON response as-is
2. **APIResponse Wrapper**: Automatically unwraps the `data` field

```typescript
// APIResponse wrapper format
{
  success: true,
  data: { ... },  // This is what gets returned
  message?: string
}

// Error format
{
  success: false,
  error: {
    code: 'ERROR_CODE',
    message: 'Error message',
    details?: { ... }
  }
}
```

## Authentication API

The Authentication API provides methods for user authentication operations.

### Available Methods

#### web3Login

Authenticate using a Web3 wallet address:

```typescript
import { getAuthAPI } from '@ai-agent/user-center-sdk'

const authApi = getAuthAPI()
const result = await authApi.web3Login({
  walletAddress: '0x1234567890123456789012345678901234567890',
  userInfo: {
    email: 'user@example.com',
    name: 'John Doe',
    profileImage: 'https://example.com/avatar.jpg'
  }
})

console.log(result.access_token)
console.log(result.user)
```

#### guestLogin

Authenticate as an anonymous guest user:

```typescript
const authApi = getAuthAPI()

// With optional guest ID
const result = await authApi.guestLogin({
  guestId: 'guest-123',
  deviceId: 'device-456'
})

// Or without parameters (auto-generate guest ID)
const result = await authApi.guestLogin()

console.log(result.user.type) // 'guest'
```

#### verifyToken

Verify an access token and retrieve user information:

```typescript
const authApi = getAuthAPI()
const result = await authApi.verifyToken({
  token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
})

if (result.valid) {
  console.log('Token is valid')
  console.log(result.user)
} else {
  console.log('Token is invalid:', result.error)
}
```

#### refreshToken

Obtain a new access token using a refresh token:

```typescript
const authApi = getAuthAPI()
const result = await authApi.refreshToken({
  refresh_token: 'refresh-token-123'
})

console.log(result.access_token)
console.log(result.refresh_token) // Optional new refresh token
console.log(result.expiresIn) // Token expiration in seconds
```

#### logout

Invalidate the current session and tokens:

```typescript
const authApi = getAuthAPI()
await authApi.logout()
console.log('Logged out successfully')
```

### Error Handling

All authentication methods throw `APIClientError` on failure:

```typescript
import { APIClientError } from '@ai-agent/user-center-sdk'

try {
  await authApi.web3Login({ walletAddress: 'invalid' })
} catch (error) {
  if (error instanceof APIClientError) {
    console.error('Auth Error:', error.message)
    console.error('Error Code:', error.code)
    
    // Handle specific error codes
    if (error.code === 'INVALID_WALLET_ADDRESS') {
      // Handle invalid wallet address
    }
  }
}
```

### Singleton Pattern

Like the API client, the AuthAPI uses a singleton pattern:

```typescript
import { getAuthAPI, createAuthAPI, resetAuthAPI } from '@ai-agent/user-center-sdk'

// Get singleton instance (recommended)
const authApi = getAuthAPI()

// Create new instance (for custom use cases)
const customAuthApi = createAuthAPI()

// Reset singleton (for testing)
resetAuthAPI()
```

## Integration with Auth Module

The API client is designed to work seamlessly with the NextAuth integration. The auth module will automatically set up the token getter and refresh callback during initialization.

## Points API

The Points API provides methods for managing user points, ledger, and daily check-ins.

### Available Methods

#### getBalance

Retrieve the current points balance and member level:

```typescript
import { getPointsAPI } from '@ai-agent/user-center-sdk'

const pointsApi = getPointsAPI()
const balance = await pointsApi.getBalance()

console.log(`Available points: ${balance.available}`)
console.log(`Frozen points: ${balance.frozen}`)
console.log(`Total points: ${balance.total}`)
console.log(`Member level: ${balance.level.level}`) // 'FREE', 'VIP', or 'SVIP'
console.log(`Level benefits:`, balance.level.benefits)

if (balance.levelExpireAt) {
  console.log(`Level expires at: ${balance.levelExpireAt}`)
}
```

#### getLedger

Retrieve points transaction history with pagination:

```typescript
const pointsApi = getPointsAPI()

// Get first page with default page size (20)
const ledger = await pointsApi.getLedger()

// Get specific page with custom page size
const ledger = await pointsApi.getLedger({
  page: 2,
  pageSize: 10
})

console.log(`Total transactions: ${ledger.total}`)
console.log(`Current page: ${ledger.page}`)
console.log(`Page size: ${ledger.pageSize}`)

ledger.items.forEach(entry => {
  console.log(`${entry.type}: ${entry.amount} points - ${entry.description}`)
  console.log(`Balance after: ${entry.balance}`)
  console.log(`Source: ${entry.source}`)
  console.log(`Created at: ${entry.createdAt}`)
  
  if (entry.expireAt) {
    console.log(`Expires at: ${entry.expireAt}`)
  }
})
```

#### checkIn

Perform daily check-in to earn points:

```typescript
const pointsApi = getPointsAPI()

try {
  const result = await pointsApi.checkIn()
  
  console.log(`Check-in successful!`)
  console.log(`Earned ${result.points} points`)
  console.log(`Consecutive days: ${result.consecutiveDays}`)
  console.log(result.message)
} catch (error) {
  if (error instanceof APIClientError) {
    if (error.code === 'ALREADY_CHECKED_IN') {
      console.log('Already checked in today')
    } else {
      console.error('Check-in failed:', error.message)
    }
  }
}
```

### Points Transaction Types

- `earn`: Points earned (check-in, deposit bonus, etc.)
- `spend`: Points spent (consumption, redemption, etc.)
- `expire`: Points expired
- `refund`: Points refunded

### Points Transaction Sources

- `checkin`: Daily check-in reward
- `deposit`: Deposit bonus
- `membership`: Membership benefits
- `promotion`: Promotional points
- `consumption`: Points used for features/services

### Member Levels

- `FREE`: Free member with basic access
- `VIP`: VIP member with enhanced benefits
- `SVIP`: Super VIP member with premium benefits

### Error Handling

```typescript
import { APIClientError } from '@ai-agent/user-center-sdk'

try {
  await pointsApi.checkIn()
} catch (error) {
  if (error instanceof APIClientError) {
    console.error('Points API Error:', error.message)
    console.error('Error Code:', error.code)
    
    // Handle specific error codes
    if (error.code === 'ALREADY_CHECKED_IN') {
      // User already checked in today
    } else if (error.code === 'UNAUTHORIZED') {
      // User not authenticated
    }
  }
}
```

### Singleton Pattern

Like other API clients, the PointsAPI uses a singleton pattern:

```typescript
import { getPointsAPI, createPointsAPI, resetPointsAPI } from '@ai-agent/user-center-sdk'

// Get singleton instance (recommended)
const pointsApi = getPointsAPI()

// Create new instance (for custom use cases)
const customPointsApi = createPointsAPI()

// Reset singleton (for testing)
resetPointsAPI()
```

## Testing

For testing, you can reset the singleton instances:

```typescript
import { resetAPIClient, resetAuthAPI, resetPointsAPI } from '@ai-agent/user-center-sdk'

afterEach(() => {
  resetAPIClient()
  resetAuthAPI()
  resetPointsAPI()
})
```
