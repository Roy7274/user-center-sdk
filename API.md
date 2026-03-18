# User Center SDK API Documentation

This document provides comprehensive API documentation for the User Center SDK, including all exported functions, components, hooks, and types.

## Table of Contents

- [SDK Initialization](#sdk-initialization)
- [Configuration](#configuration)
- [Authentication](#authentication)
- [Points Management](#points-management)
- [Deposit/Payment](#depositpayment)
- [React Components](#react-components)
- [React Hooks](#react-hooks)
- [Error Handling](#error-handling)
- [Types](#types)

## SDK Initialization

### `createSDK(config?: Partial<SDKConfig>): SDK`

Creates and initializes the SDK with the provided configuration.

**Parameters:**
- `config` (optional): Partial SDK configuration to override environment variables

**Returns:** Initialized SDK instance with all modules

**Example:**
```typescript
import { createSDK } from '@ai-agent/user-center-sdk'

const sdk = createSDK({
  userCenterUrl: 'https://api.example.com',
  appId: 'my-app-id',
  bscNetwork: 'testnet',
  contractAddress: '0x...',
  usdtAddress: '0x...',
})
```

### `getSDK(): SDK`

Gets the current SDK instance.

**Throws:** Error if SDK is not initialized

**Returns:** Current SDK instance

### `isSDKInitialized(): boolean`

Checks if SDK is initialized.

**Returns:** True if SDK is initialized, false otherwise

### `resetSDK(): void`

Resets SDK instance (mainly for testing).

## Configuration

### `initSDKConfig(config?: Partial<SDKConfig>): SDKConfig`

Initializes SDK configuration by merging environment variables with provided config.

**Parameters:**
- `config` (optional): Partial configuration to override environment variables

**Returns:** Validated SDK configuration

### `getSDKConfig(): SDKConfig`

Gets current SDK configuration.

**Throws:** Error if SDK is not initialized

**Returns:** Current SDK configuration

### `updateSDKConfig(updates: Partial<SDKConfig>): SDKConfig`

Updates SDK configuration at runtime.

**Parameters:**
- `updates`: Partial configuration updates

**Returns:** Updated SDK configuration

## Authentication

### NextAuth Integration

#### `createAuthOptions(): NextAuthOptions`

Creates NextAuth configuration with all SDK providers.

**Returns:** NextAuth options object

#### `getAuthOptions(): NextAuthOptions`

Gets current NextAuth options.

**Returns:** NextAuth options object

### Provider Functions

#### `createWeb3AuthProvider(): CredentialsProvider`

Creates Web3Auth credentials provider for NextAuth.

**Returns:** NextAuth credentials provider

#### `createUserCenterProvider(): CredentialsProvider`

Creates User Center credentials provider for NextAuth.

**Returns:** NextAuth credentials provider

#### `extractTokenFromUrl(url: string): string | null`

Extracts authentication token from URL.

**Parameters:**
- `url`: URL to extract token from

**Returns:** Token string or null if not found

## Points Management

### API Functions

#### `createPointsAPI(): PointsAPI`

Creates Points API client instance.

**Returns:** Points API client

#### `getPointsAPI(): PointsAPI`

Gets current Points API client.

**Returns:** Points API client

### Points API Methods

#### `getBalance(): Promise<PointsBalance>`

Gets user's points balance and member level.

**Returns:** Promise resolving to points balance

#### `getLedger(query?: PointsLedgerQuery): Promise<PointsLedgerResponse>`

Gets user's points transaction ledger with pagination.

**Parameters:**
- `query` (optional): Pagination and filter parameters

**Returns:** Promise resolving to paginated ledger response

#### `checkIn(): Promise<CheckInResult>`

Performs daily check-in to earn points.

**Returns:** Promise resolving to check-in result

## Deposit/Payment

### Contract Functions

#### `approveUSDT(signer: JsonRpcSigner, amount: string): Promise<TransactionResponse>`

Approves USDT spending for the payment contract.

**Parameters:**
- `signer`: Ethers signer for transaction signing
- `amount`: Amount to approve in USDT (decimal string)

**Returns:** Promise resolving to transaction response

#### `pay(signer: JsonRpcSigner, tokenType: TokenType, amount: string): Promise<TransactionResponse>`

Executes payment transaction (BNB or USDT).

**Parameters:**
- `signer`: Ethers signer for transaction signing
- `tokenType`: Token type ('BNB' or 'USDT')
- `amount`: Amount to pay (decimal string)

**Returns:** Promise resolving to transaction response

#### `checkUSDTAllowance(signer: JsonRpcSigner, owner: string): Promise<bigint>`

Checks USDT allowance for the payment contract.

**Parameters:**
- `signer`: Ethers signer
- `owner`: Owner address

**Returns:** Promise resolving to current allowance in wei

#### `hasSufficientUSDTBalance(signer: JsonRpcSigner, address: string, amount: string): Promise<boolean>`

Checks if user has sufficient USDT balance.

**Parameters:**
- `signer`: Ethers signer
- `address`: User address
- `amount`: Required amount (decimal string)

**Returns:** Promise resolving to true if sufficient balance

## React Components

### `<SDKProvider>`

Root provider component that wraps all SDK providers.

**Props:**
- `children`: Child components
- `config?`: SDK configuration
- `session?`: NextAuth session (for SSR)
- `onError?`: Error handler for initialization errors
- `loadingComponent?`: Loading component during initialization

**Example:**
```typescript
<SDKProvider config={{ userCenterUrl: 'https://api.example.com' }}>
  <App />
</SDKProvider>
```

### `<LoginDialog>`

Multi-method authentication dialog component.

**Props:**
- `open`: Whether dialog is open
- `onOpenChange`: Callback when dialog state changes
- `onSuccess?`: Callback when login succeeds
- `onError?`: Callback when login fails
- `defaultTab?`: Default tab to show ('web3auth' | 'usercenter' | 'guest')

**Example:**
```typescript
<LoginDialog
  open={showLogin}
  onOpenChange={setShowLogin}
  onSuccess={(session) => console.log('Logged in:', session.user.name)}
  onError={(error) => console.error('Login failed:', error)}
  defaultTab="web3auth"
/>
```

### `<DepositDialog>`

On-chain payment dialog component.

**Props:**
- `open`: Whether dialog is open
- `onOpenChange`: Callback when dialog state changes
- `onSuccess?`: Callback when deposit succeeds
- `onError?`: Callback when deposit fails
- `defaultTokenType?`: Default token type ('BNB' | 'USDT')
- `presetAmounts?`: Preset amount buttons

**Example:**
```typescript
<DepositDialog
  open={showDeposit}
  onOpenChange={setShowDeposit}
  onSuccess={(result) => console.log('Deposit successful:', result.txHash)}
  onError={(error) => console.error('Deposit failed:', error)}
  defaultTokenType="USDT"
  presetAmounts={[10, 50, 100, 500]}
/>
```

### `<PointsDisplay>`

Points balance and check-in component.

**Props:**
- `showLevel?`: Whether to show member level
- `showCheckIn?`: Whether to show check-in button
- `onCheckInSuccess?`: Callback when check-in succeeds
- `className?`: CSS class name

### `<PointsDetailsDialog>`

Points ledger details dialog.

**Props:**
- `open`: Whether dialog is open
- `onOpenChange`: Callback when dialog state changes

### `<AuthGuard>`

Authentication guard component.

**Props:**
- `children`: Child components
- `fallback?`: Fallback component when not authenticated
- `requireAuth?`: Whether authentication is required
- `requiredRoles?`: Required user roles
- `requiredPermissions?`: Required user permissions

## React Hooks

### `usePoints(): UsePointsReturn`

Hook for points balance management with SWR caching.

**Returns:**
- `balance`: Points balance data or null
- `isLoading`: Loading state
- `error`: Error state
- `refresh`: Function to refresh data

**Example:**
```typescript
const { balance, isLoading, error, refresh } = usePoints()

if (isLoading) return <div>Loading...</div>
if (error) return <div>Error: {error.message}</div>
if (!balance) return null

return (
  <div>
    <p>Available: {balance.available} points</p>
    <p>Level: {balance.level.level}</p>
    <button onClick={refresh}>Refresh</button>
  </div>
)
```

### `usePointsLedger(page?, pageSize?): UsePointsLedgerReturn`

Hook for points ledger with pagination.

**Parameters:**
- `page?`: Page number (default: 1)
- `pageSize?`: Page size (default: 20)

**Returns:**
- `ledger`: Array of ledger entries
- `total`: Total number of entries
- `page`: Current page
- `isLoading`: Loading state
- `error`: Error state
- `loadMore`: Function to load more entries
- `refresh`: Function to refresh data

### `useCheckIn(): UseCheckInReturn`

Hook for daily check-in functionality.

**Returns:**
- `checkIn`: Function to perform check-in
- `isCheckedIn`: Whether user has checked in today
- `isLoading`: Loading state
- `error`: Error state

### `useWallet(): UseWalletReturn`

Hook for wallet connection and interaction.

**Returns:**
- `address`: Wallet address or null
- `chainId`: Current chain ID or null
- `isConnected`: Connection status
- `connect`: Function to connect wallet
- `disconnect`: Function to disconnect wallet
- `switchNetwork`: Function to switch network
- `getBalance`: Function to get token balance

### `useDeposit(): UseDepositReturn`

Hook for deposit/payment flow management.

**Returns:**
- `deposit`: Function to execute deposit
- `verifyDeposit`: Function to verify deposit
- `isLoading`: Loading state
- `step`: Current step in deposit flow
- `error`: Error state

**Example:**
```typescript
const { deposit, isLoading, step, error } = useDeposit()

const handleDeposit = async () => {
  try {
    const result = await deposit({
      tokenType: 'USDT',
      amount: '100',
      benefitType: 'points',
      benefitAmount: 1000
    })
    console.log('Deposit successful:', result.txHash)
  } catch (err) {
    console.error('Deposit failed:', err)
  }
}
```

## Error Handling

### Error Classes

- `SDKError` - Base error class
- `APIError` - API response errors
- `NetworkError` - Network connectivity errors
- `TimeoutError` - Request timeout errors
- `WalletError` - Wallet-related errors
- `UserRejectionError` - User cancelled transaction
- `InsufficientBalanceError` - Insufficient balance
- `AuthenticationError` - Authentication failures

### Utility Functions

#### `withRetry<T>(fn: () => Promise<T>, options?: Partial<RetryOptions>): Promise<T>`

Executes function with retry logic and exponential backoff.

#### `withTimeout<T>(fn: () => Promise<T>, timeoutMs: number, timeoutMessage?: string): Promise<T>`

Wraps function with timeout.

#### `normalizeError(error: unknown): SDKError`

Converts generic error to appropriate SDK error type.

#### `isNetworkError(error: Error): boolean`

Checks if error is network-related.

#### `isUserRejectionError(error: Error): boolean`

Checks if error is user rejection.

#### `getErrorMessage(error: Error): ErrorMessage`

Gets user-friendly error message.

### Error Notification Components

#### `<NotificationProvider>`

Provides error notification context.

**Props:**
- `maxNotifications?`: Maximum number of notifications
- `autoDismissTimeout?`: Auto-dismiss timeout in milliseconds
- `position?`: Notification position

#### `useErrorHandler(): (error: Error) => void`

Hook for handling errors with automatic notifications.

## Types

### Core Types

```typescript
interface SDKConfig {
  userCenterUrl: string
  appId: string
  web3AuthClientId?: string
  web3AuthNetwork?: 'mainnet' | 'testnet' | 'cyan'
  bscNetwork: 'mainnet' | 'testnet'
  contractAddress: string
  usdtAddress: string
  rpcUrl?: string
  nextAuthUrl?: string
  nextAuthSecret?: string
  enableGuestLogin?: boolean
  enableWeb3Auth?: boolean
  enableDeposit?: boolean
  theme?: SDKTheme
  locale?: string
}

interface PointsBalance {
  available: number
  frozen: number
  total: number
  level: MemberLevel
  levelExpireAt?: string
}

interface DepositRequest {
  tokenType: 'BNB' | 'USDT'
  amount: string
  benefitType: 'points' | 'membership'
  benefitAmount?: number
  membershipLevel?: 'VIP' | 'SVIP'
  membershipDays?: number
}

interface Session {
  user: UserInfo
  access_token: string
  expires: string
}
```

### Authentication Types

```typescript
interface UserInfo {
  id: string
  email?: string
  name?: string
  type: 'guest' | 'regular' | 'web3' | 'social'
  walletAddress?: string
  profileImage?: string
  provider?: string
  roles: string[]
  permissions: string[]
  createdAt: string
}
```

### Points Types

```typescript
interface PointsLedgerEntry {
  id: string
  userId: string
  amount: number
  type: 'earn' | 'spend' | 'expire' | 'refund'
  source: 'checkin' | 'deposit' | 'membership' | 'promotion' | 'consumption'
  description: string
  balance: number
  expireAt?: string
  createdAt: string
}

interface CheckInResult {
  success: boolean
  points: number
  consecutiveDays: number
  message: string
}
```

### Deposit Types

```typescript
interface DepositResult {
  txHash: string
  tokenType: 'BNB' | 'USDT'
  amount: string
  status: 'pending' | 'confirmed' | 'failed'
  benefitsGranted: boolean
}

interface DepositRecord {
  id: string
  userId: string
  txHash: string
  tokenType: 'BNB' | 'USDT'
  amount: string
  usdAmount: number
  benefitType: 'points' | 'membership'
  benefitAmount?: number
  membershipLevel?: 'VIP' | 'SVIP'
  status: 'pending' | 'confirmed' | 'failed'
  createdAt: string
  confirmedAt?: string
}
```

## Environment Variables

The SDK supports the following environment variables:

```bash
# Required
USER_CENTER_URL=https://api.example.com
APP_ID=your-app-id
CONTRACT_ADDRESS=0x...
USDT_ADDRESS=0x...

# Optional
WEB3AUTH_CLIENT_ID=your-web3auth-client-id
WEB3AUTH_NETWORK=testnet
BSC_NETWORK=testnet
RPC_URL=https://bsc-testnet.public.blastapi.io
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret
ENABLE_GUEST_LOGIN=true
ENABLE_WEB3AUTH=true
ENABLE_DEPOSIT=true
LOCALE=en
```

## Version

Current SDK version: **0.1.0**

Access via:
```typescript
import { SDK_VERSION } from '@ai-agent/user-center-sdk'
console.log(SDK_VERSION) // "0.1.0"
```