# User Center SDK for Next.js

A comprehensive SDK for Next.js 14+ applications that provides authentication, points management, and on-chain payment functionality.

## Features

- **Authentication**: NextAuth integration with Web3Auth, User Center, and Guest login support
- **Points Management**: Query balance, transaction ledger, and daily check-in
- **On-chain Payments**: BNB and USDT deposits on BSC with automatic benefit distribution
- **TypeScript Support**: Full type definitions for all APIs
- **React Hooks**: Easy-to-use hooks for common operations
- **UI Components**: Pre-built components with Tailwind CSS styling

## Installation

```bash
npm install @ai-agent/user-center-sdk
# or
yarn add @ai-agent/user-center-sdk
# or
pnpm add @ai-agent/user-center-sdk
```

## Quick Start

### 1. Initialize SDK

```typescript
import { initSDKConfig } from '@ai-agent/user-center-sdk'

initSDKConfig({
  userCenterUrl: 'https://api.example.com',
  appId: 'your-app-id',
  bscNetwork: 'testnet',
  contractAddress: '0x...',
  usdtAddress: '0x...',
})
```

### 2. Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_USER_CENTER_URL=https://api.example.com
NEXT_PUBLIC_APP_ID=your-app-id
NEXT_PUBLIC_BSC_NETWORK=testnet
NEXT_PUBLIC_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_USDT_ADDRESS=0x...
NEXT_PUBLIC_WEB3AUTH_CLIENT_ID=your-web3auth-client-id
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret
```

## Documentation

Full documentation will be available soon.

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Build
npm run build

# Type check
npm run type-check
```

## License

MIT
