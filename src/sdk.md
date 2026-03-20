# SDK Initialization

The `createSDK` function is the main entry point for initializing the User Center SDK. It loads configuration from environment variables and provided parameters, validates the configuration, and returns an SDK instance with all modules.

## Basic Usage

```typescript
import { createSDK } from '@ai-agent/user-center-sdk'

// Initialize with environment variables only
const sdk = createSDK()

// Access SDK modules
const balance = await sdk.points.getBalance()
const session = await sdk.auth.web3Login({ ... })
```

## Configuration

### Required Configuration

The following fields are required and must be provided either through environment variables or the config parameter:

- `userCenterUrl` - User Center API base URL
- `appId` - Application ID for API authentication
- `bscNetwork` - BSC network ('mainnet' or 'testnet')
- `contractAddress` - Payment contract address (must be valid Ethereum address)
- `usdtAddress` - USDT token contract address (must be valid Ethereum address)

### Optional Configuration

- `web3AuthClientId` - Web3Auth client ID (required if using Web3Auth)
- `web3AuthNetwork` - Web3Auth network ('mainnet', 'testnet', or 'cyan')
- `rpcUrl` - Custom RPC URL for blockchain interaction
- `nextAuthUrl` - NextAuth URL (defaults to NEXTAUTH_URL env var)
- `nextAuthSecret` - NextAuth secret (defaults to NEXTAUTH_SECRET env var)
- `enableGuestLogin` - Enable guest login (default: true)
- `enableWeb3Auth` - Enable Web3Auth login (default: true)
- `enableDeposit` - Enable deposit functionality (default: true)
- `theme` - Custom theme configuration
- `locale` - Locale for UI components (default: 'en')

### Environment Variables

The SDK automatically loads configuration from the following environment variables:

```bash
# Required
NEXT_PUBLIC_USER_CENTER_URL=https://api.example.com
NEXT_PUBLIC_APP_ID=your-app-id
NEXT_PUBLIC_BSC_NETWORK=testnet
NEXT_PUBLIC_CONTRACT_ADDRESS=0x1234567890123456789012345678901234567890
NEXT_PUBLIC_USDT_ADDRESS=0x0987654321098765432109876543210987654321

# Optional
NEXT_PUBLIC_WEB3AUTH_CLIENT_ID=your-web3auth-client-id
NEXT_PUBLIC_WEB3AUTH_NETWORK=cyan
NEXT_PUBLIC_RPC_URL=https://custom-rpc.example.com
NEXTAUTH_URL=https://app.example.com
NEXTAUTH_SECRET=your-nextauth-secret
NEXT_PUBLIC_ENABLE_GUEST_LOGIN=true
NEXT_PUBLIC_ENABLE_WEB3AUTH=true
NEXT_PUBLIC_ENABLE_DEPOSIT=true
NEXT_PUBLIC_LOCALE=en
```

## Examples

### Initialize with Custom Configuration

```typescript
import { createSDK } from '@ai-agent/user-center-sdk'

const sdk = createSDK({
  userCenterUrl: 'https://api.example.com',
  appId: 'my-app-id',
  bscNetwork: 'testnet',
  contractAddress: '0x1234567890123456789012345678901234567890',
  usdtAddress: '0x0987654321098765432109876543210987654321',
  enableGuestLogin: false,
  locale: 'zh',
})
```

### Initialize with Custom Theme

```typescript
import { createSDK } from '@ai-agent/user-center-sdk'

const sdk = createSDK({
  userCenterUrl: 'https://api.example.com',
  appId: 'my-app-id',
  bscNetwork: 'testnet',
  contractAddress: '0x1234567890123456789012345678901234567890',
  usdtAddress: '0x0987654321098765432109876543210987654321',
  theme: {
    primaryColor: '#ff0000',
    borderRadius: '8px',
    fontFamily: 'Arial, sans-serif',
  },
})
```

### Initialize with Web3Auth

```typescript
import { createSDK } from '@ai-agent/user-center-sdk'

const sdk = createSDK({
  userCenterUrl: 'https://api.example.com',
  appId: 'my-app-id',
  bscNetwork: 'testnet',
  contractAddress: '0x1234567890123456789012345678901234567890',
  usdtAddress: '0x0987654321098765432109876543210987654321',
  web3AuthClientId: 'your-web3auth-client-id',
  web3AuthNetwork: 'cyan',
  enableWeb3Auth: true,
})
```

### Override Environment Variables

```typescript
import { createSDK } from '@ai-agent/user-center-sdk'

// Environment variables are loaded first, then overridden by config
const sdk = createSDK({
  // Override specific values
  userCenterUrl: 'https://override.example.com',
  appId: 'override-app-id',
  // Other values come from environment variables
})
```

## SDK Instance

The SDK instance provides access to all modules:

```typescript
interface SDK {
  config: SDKConfig          // SDK configuration
  apiClient: APIClient       // Base API client
  auth: AuthAPI              // Authentication API
  points: PointsAPI          // Points management API
  deposit: DepositAPI        // Deposit/payment API
  version: string            // SDK version
}
```

### Using SDK Modules

```typescript
// Authentication
const session = await sdk.auth.web3Login({
  walletAddress: '0x...',
  email: 'user@example.com',
  name: 'User Name',
})

// Points Management
const balance = await sdk.points.getBalance()
const ledger = await sdk.points.getLedger({ page: 1, pageSize: 20 })
const checkInResult = await sdk.points.checkIn()

// Deposit
const depositRecord = await sdk.deposit.saveDepositRecord({
  txHash: '0x...',
  tokenType: 'USDT',
  amount: '100',
  benefitType: 'points',
  benefitAmount: 1000,
})

const verifyResult = await sdk.deposit.verifyDeposit('0x...')

// Payment only (save record without benefit_type; no benefit polling)
const paymentRecord = await sdk.deposit.savePaymentRecordOnly({
  userId: 'user-id',
  txHash: '0x...',
  tokenType: 'USDT',
  tokenAddress: '0x...',
  amount: '49.9',
  amountWei: '...',
  walletAddress: '0x...',
  network: 'BSC Testnet',
  timestamp: Math.floor(Date.now() / 1000),
  orderId: 'order-001',
  orderName: 'Membership',
})
```

React UI / hook:

```typescript
import { PaymentOnlyDialog, usePaymentOnly } from '@ai-agent/user-center-sdk'

// Dialog with prefilled order + amount
<PaymentOnlyDialog
  open={open}
  onOpenChange={setOpen}
  initialRequest={{
    userId: session.user.id,
    tokenType: 'USDT',
    amount: '49.9',
    orderId: 'order-20260320-0001',
    orderName: '购买会员',
    metadata: { plan: 'SVIP' },
  }}
  onSuccess={(r) => console.log(r.txHash, r.backendRecordId)}
/>
```

## Helper Functions

### getSDK()

Get the current SDK instance (must be initialized first):

```typescript
import { getSDK } from '@ai-agent/user-center-sdk'

const sdk = getSDK()
const balance = await sdk.points.getBalance()
```

### isSDKInitialized()

Check if SDK is initialized:

```typescript
import { isSDKInitialized, createSDK } from '@ai-agent/user-center-sdk'

if (!isSDKInitialized()) {
  createSDK()
}
```

### resetSDK()

Reset SDK instance (mainly for testing):

```typescript
import { resetSDK } from '@ai-agent/user-center-sdk'

// In test cleanup
afterEach(() => {
  resetSDK()
})
```

## Error Handling

The SDK validates configuration on initialization and throws errors for invalid values:

```typescript
import { createSDK } from '@ai-agent/user-center-sdk'

try {
  const sdk = createSDK({
    userCenterUrl: 'invalid-url', // Invalid URL format
    appId: 'my-app-id',
    bscNetwork: 'testnet',
    contractAddress: 'invalid-address', // Invalid Ethereum address
    usdtAddress: '0x0987654321098765432109876543210987654321',
  })
} catch (error) {
  console.error('SDK initialization failed:', error.message)
  // Handle initialization error
}
```

## Best Practices

1. **Initialize Once**: Call `createSDK()` once at application startup
2. **Use Environment Variables**: Store sensitive configuration in environment variables
3. **Validate Configuration**: Ensure all required fields are provided before initialization
4. **Handle Errors**: Wrap initialization in try-catch to handle validation errors
5. **Use getSDK()**: Access the SDK instance using `getSDK()` instead of passing it around
6. **Reset in Tests**: Use `resetSDK()` in test cleanup to ensure clean state

## Next.js Integration

### App Router (Next.js 14+)

```typescript
// app/layout.tsx
import { createSDK } from '@ai-agent/user-center-sdk'

// Initialize SDK at application startup
const sdk = createSDK()

export default function RootLayout({ children }) {
  return (
    <html>
      <body>{children}</body>
    </html>
  )
}
```

### API Routes

```typescript
// app/api/points/route.ts
import { getSDK } from '@ai-agent/user-center-sdk'

export async function GET() {
  const sdk = getSDK()
  const balance = await sdk.points.getBalance()
  return Response.json(balance)
}
```

### Client Components

```typescript
// app/components/PointsDisplay.tsx
'use client'

import { usePoints } from '@ai-agent/user-center-sdk'

export function PointsDisplay() {
  const { balance, isLoading, error } = usePoints()
  
  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>
  
  return <div>Points: {balance?.available}</div>
}
```
