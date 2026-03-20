# Next.js 用户中心 SDK

一个为 Next.js 14+ 应用程序提供身份验证、积分管理和链上支付功能的综合 SDK。

## 🚀 快速开始

### 安装

```bash
# 配置 GitHub Packages 注册表
echo "@roy7274:registry=https://npm.pkg.github.com" >> .npmrc
echo "//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}" >> .npmrc

# 安装 SDK
npm install @roy7274/user-center-sdk@0.1.0
```

> **注意**: 你需要一个 GitHub Personal Access Token 来安装此包。详见 [安装指南](./INSTALLATION-GUIDE.md)。

### 基本使用

```typescript
import { SDKProvider, useAuth, usePoints } from '@roy7274/user-center-sdk'

// 1. 配置 SDK Provider
function App() {
  return (
    <SDKProvider
      config={{
        userCenterUrl: 'https://your-api.example.com',
        appId: 'your-app-id',
        bscNetwork: 'testnet',
        contractAddress: '0x...',
        usdtAddress: '0x...',
      }}
    >
      <YourApp />
    </SDKProvider>
  )
}

// 2. 使用认证功能
function LoginButton() {
  const { login, logout, user, isAuthenticated } = useAuth()
  
  return isAuthenticated ? (
    <button onClick={logout}>退出 ({user?.name})</button>
  ) : (
    <button onClick={() => login('web3')}>Web3 登录</button>
  )
}

// 3. 使用积分功能
function PointsDisplay() {
  const { balance, isLoading } = usePoints()
  
  return <div>积分: {isLoading ? '加载中...' : balance}</div>
}
```

## 📖 文档

- [💳 SDK 支付使用说明](./docs/sdk-支付使用说明.md) - 充值（含权益）与仅支付（PaymentOnly）接入指南
- [📦 安装指南](./INSTALLATION-GUIDE.md) - 详细的安装和配置说明
- [📚 API 文档](./API.md) - 完整的 API 参考
- [🎯 使用示例](./examples/) - 实际项目示例
- [🔧 发布指南](./PUBLISHING-GUIDE.md) - 如何发布新版本

## 功能特性

- **身份验证**: 集成 NextAuth，支持 Web3Auth、用户中心和访客登录
- **积分管理**: 查询余额、交易记录和每日签到
- **链上支付**: 在 BSC 上支持 BNB 和 USDT 充值
- **TypeScript 支持**: 为所有 API 提供完整的类型定义
- **React Hooks**: 为常用操作提供易于使用的 hooks
- **UI 组件**: 使用 Tailwind CSS 样式的预构建组件

## 安装

请参考 [安装指南](./INSTALLATION-GUIDE.md) 获取详细的安装说明。

简短版本：
```bash
# 配置 GitHub Packages
echo "@roy7274:registry=https://npm.pkg.github.com" >> .npmrc
npm install @roy7274/user-center-sdk@0.1.0
```
pnpm add @ai-agent/user-center-sdk
```

## 快速开始

### 1. 初始化 SDK

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

### 2. 环境变量

创建 `.env.local` 文件：

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

## 文档

完整文档即将推出。

## 开发

```bash
# 安装依赖
npm install

# 运行测试
npm test

# 构建
npm run build

# 类型检查
npm run type-check
```

## 许可证

MIT