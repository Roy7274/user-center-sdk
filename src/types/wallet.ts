import { IProvider } from '@web3auth/base'

/**
 * Wallet connection state
 */
export interface WalletState {
  address: string | null
  chainId: number | null
  isConnected: boolean
  provider: IProvider | null
}

/**
 * Network information
 */
export interface NetworkInfo {
  chainId: number
  chainIdHex: string
  name: string
  rpcUrl: string
  blockExplorer: string
  nativeCurrency: {
    name: string
    symbol: string
    decimals: number
  }
}

/**
 * Token balance
 */
export interface TokenBalance {
  balance: string
  decimals: number
  symbol: string
  formatted: string
}

/**
 * Transaction receipt
 */
export interface TransactionReceipt {
  transactionHash: string
  blockNumber: number
  blockHash: string
  from: string
  to: string
  status: number
  gasUsed: string
}
