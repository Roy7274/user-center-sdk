import { z } from 'zod'

/**
 * SDK Theme Configuration
 */
export interface SDKTheme {
  primaryColor?: string
  borderRadius?: string
  fontFamily?: string
}

/**
 * SDK Configuration Interface
 */
export interface SDKConfig {
  // User Center API Configuration
  userCenterUrl: string
  appId: string

  // Web3Auth Configuration (optional)
  web3AuthClientId?: string
  web3AuthNetwork?: 'mainnet' | 'testnet' | 'cyan'

  // Blockchain Configuration
  bscNetwork: 'mainnet' | 'testnet'
  contractAddress: string
  usdtAddress: string
  rpcUrl?: string

  // NextAuth Configuration
  nextAuthUrl?: string
  nextAuthSecret?: string

  // Optional Features
  enableGuestLogin?: boolean
  enableWeb3Auth?: boolean
  enableDeposit?: boolean

  // Custom Configuration
  theme?: SDKTheme
  locale?: string
}

/**
 * Zod schema for SDK configuration validation
 */
export const SDKConfigSchema = z.object({
  userCenterUrl: z.string().url('User Center URL must be a valid URL'),
  appId: z.string().min(1, 'App ID is required'),
  web3AuthClientId: z.string().optional(),
  web3AuthNetwork: z.enum(['mainnet', 'testnet', 'cyan']).optional(),
  bscNetwork: z.enum(['mainnet', 'testnet']),
  contractAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid contract address'),
  usdtAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid USDT address'),
  rpcUrl: z.string().url().optional(),
  nextAuthUrl: z.string().url().optional(),
  nextAuthSecret: z.string().optional(),
  enableGuestLogin: z.boolean().optional().default(true),
  enableWeb3Auth: z.boolean().optional().default(true),
  enableDeposit: z.boolean().optional().default(true),
  theme: z
    .object({
      primaryColor: z.string().optional(),
      borderRadius: z.string().optional(),
      fontFamily: z.string().optional(),
    })
    .optional(),
  locale: z.string().optional().default('en'),
})

/**
 * Environment variable names for SDK configuration
 */
export const ENV_KEYS = {
  USER_CENTER_URL: 'NEXT_PUBLIC_USER_CENTER_URL',
  APP_ID: 'NEXT_PUBLIC_APP_ID',
  WEB3AUTH_CLIENT_ID: 'NEXT_PUBLIC_WEB3AUTH_CLIENT_ID',
  WEB3AUTH_NETWORK: 'NEXT_PUBLIC_WEB3AUTH_NETWORK',
  BSC_NETWORK: 'NEXT_PUBLIC_BSC_NETWORK',
  CONTRACT_ADDRESS: 'NEXT_PUBLIC_CONTRACT_ADDRESS',
  USDT_ADDRESS: 'NEXT_PUBLIC_USDT_ADDRESS',
  RPC_URL: 'NEXT_PUBLIC_RPC_URL',
  NEXTAUTH_URL: 'NEXTAUTH_URL',
  NEXTAUTH_SECRET: 'NEXTAUTH_SECRET',
  ENABLE_GUEST_LOGIN: 'NEXT_PUBLIC_ENABLE_GUEST_LOGIN',
  ENABLE_WEB3AUTH: 'NEXT_PUBLIC_ENABLE_WEB3AUTH',
  ENABLE_DEPOSIT: 'NEXT_PUBLIC_ENABLE_DEPOSIT',
  LOCALE: 'NEXT_PUBLIC_LOCALE',
} as const

/**
 * BSC Chain Configuration
 */
export const BSC_CHAIN_CONFIG = {
  mainnet: {
    chainId: 56,
    chainIdHex: '0x38',
    name: 'BNB Smart Chain',
    rpcUrl: 'https://bsc-dataseed.binance.org/',
    blockExplorer: 'https://bscscan.com',
    nativeCurrency: {
      name: 'BNB',
      symbol: 'BNB',
      decimals: 18,
    },
  },
  testnet: {
    chainId: 97,
    chainIdHex: '0x61',
    name: 'BNB Smart Chain Testnet',
    rpcUrl: 'https://data-seed-prebsc-1-s1.binance.org:8545/',
    blockExplorer: 'https://testnet.bscscan.com',
    nativeCurrency: {
      name: 'tBNB',
      symbol: 'tBNB',
      decimals: 18,
    },
  },
} as const

export type BSCNetwork = keyof typeof BSC_CHAIN_CONFIG
