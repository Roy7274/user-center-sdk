# User Center SDK 使用指南

## 概述

User Center SDK 是一个为 Next.js 应用程序设计的综合性 SDK，提供用户身份验证、积分管理和区块链支付功能。

## 目录

1. [安装和配置](#安装和配置)
2. [身份验证](#身份验证)
3. [积分管理](#积分管理)
4. [充值功能](#充值功能)
5. [React Hooks](#react-hooks)
6. [UI 组件](#ui-组件)
7. [API 参考](#api-参考)
8. [错误处理](#错误处理)
9. [最佳实践](#最佳实践)

## 安装和配置

### 1. 安装 SDK

```bash
npm install @ai-agent/user-center-sdk
```

### 2. 环境变量配置

在项目根目录创建 `.env.local` 文件：

```env
# 用户中心 API 地址
NEXT_PUBLIC_USER_CENTER_URL=https://api.example.com

# 应用 ID
NEXT_PUBLIC_APP_ID=your-app-id

# BSC 网络配置 (mainnet 或 testnet)
NEXT_PUBLIC_BSC_NETWORK=testnet

# 智能合约地址
NEXT_PUBLIC_CONTRACT_ADDRESS=0x1234567890123456789012345678901234567890

# USDT 合约地址
NEXT_PUBLIC_USDT_ADDRESS=0x0987654321098765432109876543210987654321

# Web3Auth 客户端 ID
NEXT_PUBLIC_WEB3AUTH_CLIENT_ID=your-web3auth-client-id

# NextAuth 配置
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret-key
```

### 3. SDK 初始化

在你的应用程序入口文件（如 `_app.tsx` 或 `layout.tsx`）中初始化 SDK：

```typescript
import { initSDKConfig } from '@ai-agent/user-center-sdk'

// 在应用启动时调用
initSDKConfig({
  userCenterUrl: process.env.NEXT_PUBLIC_USER_CENTER_URL!,
  appId: process.env.NEXT_PUBLIC_APP_ID!,
  bscNetwork: process.env.NEXT_PUBLIC_BSC_NETWORK as 'mainnet' | 'testnet',
  contractAddress: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS!,
  usdtAddress: process.env.NEXT_PUBLIC_USDT_ADDRESS!,
})
```

### 4. 提供者组件设置

在你的应用程序中包装必要的提供者：

```typescript
import { SDKProvider, Web3Provider } from '@ai-agent/user-center-sdk'
import { SessionProvider } from 'next-auth/react'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <SessionProvider session={pageProps.session}>
      <SDKProvider>
        <Web3Provider>
          <Component {...pageProps} />
        </Web3Provider>
      </SDKProvider>
    </SessionProvider>
  )
}
```

## 身份验证

### NextAuth 配置

创建 `pages/api/auth/[...nextauth].ts` 或 `app/api/auth/[...nextauth]/route.ts`：

```typescript
import { createNextAuthConfig } from '@ai-agent/user-center-sdk'

const authConfig = createNextAuthConfig({
  web3AuthClientId: process.env.NEXT_PUBLIC_WEB3AUTH_CLIENT_ID!,
  userCenterUrl: process.env.NEXT_PUBLIC_USER_CENTER_URL!,
  appId: process.env.NEXT_PUBLIC_APP_ID!,
})

export default NextAuth(authConfig)
// 或者对于 App Router: export { handler as GET, handler as POST }
```

### 登录组件使用

```typescript
import { LoginDialog } from '@ai-agent/user-center-sdk'
import { useState } from 'react'

export default function LoginPage() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div>
      <button onClick={() => setIsOpen(true)}>
        登录
      </button>
      
      <LoginDialog 
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSuccess={(user) => {
          console.log('登录成功:', user)
          setIsOpen(false)
        }}
      />
    </div>
  )
}
```

### 身份验证守卫

```typescript
import { AuthGuard } from '@ai-agent/user-center-sdk'

export default function ProtectedPage() {
  return (
    <AuthGuard
      fallback={<div>请先登录</div>}
      loadingComponent={<div>加载中...</div>}
    >
      <div>这是受保护的内容</div>
    </AuthGuard>
  )
}
```

## 积分管理

### 查询积分余额

```typescript
import { usePoints } from '@ai-agent/user-center-sdk'

export default function PointsDisplay() {
  const { data: points, isLoading, error } = usePoints()

  if (isLoading) return <div>加载中...</div>
  if (error) return <div>加载失败</div>

  return (
    <div>
      <h2>我的积分</h2>
      <p>当前余额: {points?.balance || 0}</p>
    </div>
  )
}
```

### 积分交易记录

```typescript
import { usePointsLedger } from '@ai-agent/user-center-sdk'

export default function PointsHistory() {
  const { 
    data: ledger, 
    isLoading, 
    error,
    fetchNextPage,
    hasNextPage 
  } = usePointsLedger({
    page: 1,
    limit: 20
  })

  return (
    <div>
      <h2>积分记录</h2>
      {ledger?.pages.map((page, i) => (
        <div key={i}>
          {page.data.map((transaction) => (
            <div key={transaction.id} className="border p-4 mb-2">
              <p>类型: {transaction.type}</p>
              <p>金额: {transaction.amount}</p>
              <p>时间: {new Date(transaction.createdAt).toLocaleString()}</p>
            </div>
          ))}
        </div>
      ))}
      
      {hasNextPage && (
        <button onClick={() => fetchNextPage()}>
          加载更多
        </button>
      )}
    </div>
  )
}
```

### 每日签到

```typescript
import { useCheckIn } from '@ai-agent/user-center-sdk'

export default function CheckInButton() {
  const { mutate: checkIn, isPending, error } = useCheckIn()

  const handleCheckIn = () => {
    checkIn(undefined, {
      onSuccess: (result) => {
        alert(`签到成功！获得 ${result.points} 积分`)
      },
      onError: (error) => {
        alert(`签到失败: ${error.message}`)
      }
    })
  }

  return (
    <button 
      onClick={handleCheckIn}
      disabled={isPending}
      className="bg-blue-500 text-white px-4 py-2 rounded"
    >
      {isPending ? '签到中...' : '每日签到'}
    </button>
  )
}
```

## 充值功能

### 充值对话框

```typescript
import { DepositDialog } from '@ai-agent/user-center-sdk'
import { useState } from 'react'

export default function DepositPage() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div>
      <button onClick={() => setIsOpen(true)}>
        充值
      </button>
      
      <DepositDialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSuccess={(result) => {
          console.log('充值成功:', result)
          alert(`充值成功！交易哈希: ${result.txHash}`)
        }}
      />
    </div>
  )
}
```

### 自定义充值逻辑

```typescript
import { useDeposit, useWallet } from '@ai-agent/user-center-sdk'

export default function CustomDeposit() {
  const { connect, account, isConnected } = useWallet()
  const { mutate: deposit, isPending } = useDeposit()

  const handleDeposit = async () => {
    if (!isConnected) {
      await connect()
      return
    }

    deposit({
      amount: '100', // USDT 金额
      currency: 'USDT'
    }, {
      onSuccess: (result) => {
        console.log('充值成功:', result)
      },
      onError: (error) => {
        console.error('充值失败:', error)
      }
    })
  }

  return (
    <div>
      <p>钱包地址: {account || '未连接'}</p>
      <button onClick={handleDeposit} disabled={isPending}>
        {isPending ? '充值中...' : '充值 100 USDT'}
      </button>
    </div>
  )
}
```

## React Hooks

### usePoints - 积分查询

```typescript
const { data, isLoading, error, refetch } = usePoints()
```

### usePointsLedger - 积分记录

```typescript
const { 
  data, 
  isLoading, 
  error, 
  fetchNextPage, 
  hasNextPage 
} = usePointsLedger({ page: 1, limit: 20 })
```

### useCheckIn - 每日签到

```typescript
const { mutate, isPending, error } = useCheckIn()
```

### useDeposit - 充值

```typescript
const { mutate, isPending, error } = useDeposit()
```

### useWallet - 钱包连接

```typescript
const { 
  connect, 
  disconnect, 
  account, 
  isConnected, 
  balance 
} = useWallet()
```

## UI 组件

### LoginDialog - 登录对话框

```typescript
<LoginDialog 
  isOpen={boolean}
  onClose={() => void}
  onSuccess={(user) => void}
/>
```

### DepositDialog - 充值对话框

```typescript
<DepositDialog
  isOpen={boolean}
  onClose={() => void}
  onSuccess={(result) => void}
/>
```

### PointsDisplay - 积分显示

```typescript
<PointsDisplay 
  showDetails={boolean}
  className="custom-class"
/>
```

### AuthGuard - 身份验证守卫

```typescript
<AuthGuard
  fallback={<LoginPrompt />}
  loadingComponent={<Loading />}
>
  <ProtectedContent />
</AuthGuard>
```

## API 参考

### 配置类型

```typescript
interface SDKConfig {
  userCenterUrl: string
  appId: string
  bscNetwork: 'mainnet' | 'testnet'
  contractAddress: string
  usdtAddress: string
}
```

### 用户类型

```typescript
interface User {
  id: string
  email?: string
  name?: string
  avatar?: string
  walletAddress?: string
}
```

### 积分类型

```typescript
interface Points {
  balance: number
  totalEarned: number
  totalSpent: number
}

interface PointsTransaction {
  id: string
  type: 'earn' | 'spend'
  amount: number
  description: string
  createdAt: string
}
```

### 充值类型

```typescript
interface DepositRequest {
  amount: string
  currency: 'BNB' | 'USDT'
}

interface DepositResult {
  txHash: string
  amount: string
  currency: string
  status: 'pending' | 'confirmed' | 'failed'
}
```

## 错误处理

### 全局错误处理

```typescript
import { ErrorNotification } from '@ai-agent/user-center-sdk'

export default function App() {
  return (
    <div>
      {/* 你的应用内容 */}
      <ErrorNotification />
    </div>
  )
}
```

### 自定义错误处理

```typescript
import { usePoints } from '@ai-agent/user-center-sdk'

export default function PointsComponent() {
  const { data, error } = usePoints()

  if (error) {
    // 处理特定错误
    if (error.code === 'UNAUTHORIZED') {
      return <div>请先登录</div>
    }
    if (error.code === 'NETWORK_ERROR') {
      return <div>网络连接失败，请重试</div>
    }
    return <div>发生未知错误: {error.message}</div>
  }

  return <div>积分: {data?.balance}</div>
}
```

## 最佳实践

### 1. 错误边界

```typescript
import { ErrorBoundary } from 'react-error-boundary'

function ErrorFallback({ error, resetErrorBoundary }) {
  return (
    <div role="alert">
      <h2>出现错误:</h2>
      <pre>{error.message}</pre>
      <button onClick={resetErrorBoundary}>重试</button>
    </div>
  )
}

export default function App() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <YourApp />
    </ErrorBoundary>
  )
}
```

### 2. 加载状态管理

```typescript
export default function PointsPage() {
  const { data: points, isLoading } = usePoints()
  const { data: ledger, isLoading: ledgerLoading } = usePointsLedger()

  const isAnyLoading = isLoading || ledgerLoading

  if (isAnyLoading) {
    return <div className="animate-pulse">加载中...</div>
  }

  return (
    <div>
      <PointsDisplay />
      <PointsHistory />
    </div>
  )
}
```

### 3. 条件渲染

```typescript
import { useSession } from 'next-auth/react'

export default function Dashboard() {
  const { data: session, status } = useSession()

  if (status === 'loading') return <div>加载中...</div>
  if (status === 'unauthenticated') return <LoginDialog />

  return (
    <div>
      <h1>欢迎, {session.user?.name}</h1>
      <PointsDisplay />
      <DepositButton />
    </div>
  )
}
```

### 4. 性能优化

```typescript
import { memo } from 'react'
import { usePoints } from '@ai-agent/user-center-sdk'

const PointsDisplay = memo(() => {
  const { data } = usePoints()
  
  return <div>积分: {data?.balance}</div>
})

export default PointsDisplay
```

## 常见问题

### Q: 如何处理网络错误？
A: SDK 内置了重试机制，你也可以使用 `refetch` 方法手动重试。

### Q: 如何自定义样式？
A: 所有组件都支持 `className` 属性，你可以使用 Tailwind CSS 或自定义 CSS。

### Q: 如何在服务端渲染中使用？
A: 确保在客户端组件中使用 hooks，并正确处理 hydration。

### Q: 如何处理钱包连接失败？
A: 使用 `useWallet` hook 的错误状态，并提供用户友好的错误信息。

## 支持

如果你遇到问题或需要帮助，请：

1. 查看本文档的相关部分
2. 检查控制台错误信息
3. 确认环境变量配置正确
4. 联系技术支持团队
