/**
 * useWallet Hook
 * 
 * Convenience hook that wraps the Web3Provider context for easier wallet interaction.
 * 
 * Features:
 * - Wallet address and chain ID access
 * - Connection status tracking
 * - Connect/disconnect wallet methods
 * - Network switching capability
 * - Balance queries for BNB and ERC20 tokens
 * 
 * @module hooks/useWallet
 */

import { useWeb3 } from '../components/Web3Provider'

/**
 * useWallet hook return type
 */
export interface UseWalletReturn {
  address: string | null
  chainId: number | null
  isConnected: boolean
  connect: () => Promise<void>
  disconnect: () => Promise<void>
  switchNetwork: (chainId: number) => Promise<void>
  getBalance: (tokenAddress?: string) => Promise<string>
}

/**
 * useWallet - Convenience hook for wallet interaction
 * 
 * Wraps the Web3Provider context to provide a clean interface for wallet
 * operations. This hook exposes wallet state and methods for connecting,
 * disconnecting, switching networks, and querying balances.
 * 
 * @returns Object containing wallet state and interaction methods
 * 
 * @example
 * ```typescript
 * function WalletButton() {
 *   const { address, isConnected, connect, disconnect } = useWallet()
 * 
 *   if (!isConnected) {
 *     return <button onClick={connect}>Connect Wallet</button>
 *   }
 * 
 *   return (
 *     <div>
 *       <p>Connected: {address}</p>
 *       <button onClick={disconnect}>Disconnect</button>
 *     </div>
 *   )
 * }
 * ```
 * 
 * @example
 * ```typescript
 * function BalanceDisplay() {
 *   const { address, getBalance, isConnected } = useWallet()
 *   const [balance, setBalance] = useState<string>('0')
 * 
 *   useEffect(() => {
 *     if (isConnected && address) {
 *       // Get BNB balance
 *       getBalance().then(setBalance)
 *       
 *       // Or get USDT balance
 *       // getBalance('0x55d398326f99059fF775485246999027B3197955').then(setBalance)
 *     }
 *   }, [isConnected, address])
 * 
 *   return <div>Balance: {balance}</div>
 * }
 * ```
 * 
 * @example
 * ```typescript
 * function NetworkSwitcher() {
 *   const { chainId, switchNetwork } = useWallet()
 *   const BSC_MAINNET = 56
 *   const BSC_TESTNET = 97
 * 
 *   const handleSwitch = async () => {
 *     try {
 *       await switchNetwork(BSC_MAINNET)
 *     } catch (error) {
 *       console.error('Failed to switch network:', error)
 *     }
 *   }
 * 
 *   return (
 *     <div>
 *       <p>Current Chain: {chainId}</p>
 *       <button onClick={handleSwitch}>Switch to BSC</button>
 *     </div>
 *   )
 * }
 * ```
 */
export function useWallet(): UseWalletReturn {
  const web3Context = useWeb3()

  return {
    address: web3Context.address,
    chainId: web3Context.chainId,
    isConnected: web3Context.isConnected,
    connect: web3Context.connect,
    disconnect: web3Context.disconnect,
    switchNetwork: web3Context.switchNetwork,
    getBalance: web3Context.getBalance,
  }
}
