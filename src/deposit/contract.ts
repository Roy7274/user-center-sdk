/**
 * Payment Contract Interaction Utilities
 * 
 * This module provides utilities for interacting with the payment smart contract
 * on BSC (Binance Smart Chain). It handles both BNB and USDT payments.
 * 
 * Features:
 * - Contract ABI and interface definitions
 * - USDT approval for contract spending
 * - Payment execution (BNB and USDT)
 * - Transaction waiting and confirmation
 * 
 * @module deposit/contract
 */

import { Contract, parseUnits, formatUnits, TransactionResponse, TransactionReceipt } from 'ethers'
import { getSDKConfig } from '../config/sdk-config'
import { TokenType } from '../types/deposit'
import type { JsonRpcSigner } from 'ethers'

/**
 * ERC20 Token ABI (minimal interface for approve and balanceOf)
 */
export const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)',
] as const

/**
 * Payment Contract ABI
 * Defines the interface for the payment smart contract
 */
export const PAYMENT_CONTRACT_ABI = [
  'function pay(uint8 tokenType, uint256 amount) payable',
  'event Payment(address indexed user, uint8 tokenType, uint256 amount, uint256 timestamp)',
] as const

/**
 * Token type enum for contract interaction
 * 0 = BNB, 1 = USDT
 */
export enum ContractTokenType {
  BNB = 0,
  USDT = 1,
}

/**
 * Convert SDK TokenType to contract token type
 */
export function tokenTypeToContractType(tokenType: TokenType): ContractTokenType {
  return tokenType === 'BNB' ? ContractTokenType.BNB : ContractTokenType.USDT
}

/**
 * Get USDT contract instance
 * @param signer - Ethers signer for transaction signing
 * @returns USDT contract instance
 */
export function getUSDTContract(signer: JsonRpcSigner): Contract {
  const config = getSDKConfig()
  return new Contract(config.usdtAddress, ERC20_ABI, signer)
}

/**
 * Get payment contract instance
 * @param signer - Ethers signer for transaction signing
 * @returns Payment contract instance
 */
export function getPaymentContract(signer: JsonRpcSigner): Contract {
  const config = getSDKConfig()
  return new Contract(config.contractAddress, PAYMENT_CONTRACT_ABI, signer)
}

/**
 * Check USDT allowance for the payment contract
 * @param signer - Ethers signer
 * @param owner - Owner address
 * @returns Current allowance in wei
 */
export async function checkUSDTAllowance(
  signer: JsonRpcSigner,
  owner: string
): Promise<bigint> {
  const config = getSDKConfig()
  const usdtContract = getUSDTContract(signer)
  
  const allowance = await usdtContract.allowance(owner, config.contractAddress)
  return allowance
}

/**
 * Approve USDT spending for the payment contract
 * @param signer - Ethers signer for transaction signing
 * @param amount - Amount to approve in USDT (as decimal string, e.g., "100.5")
 * @returns Transaction response
 * 
 * @example
 * ```typescript
 * const signer = await provider.getSigner()
 * const tx = await approveUSDT(signer, "100")
 * const receipt = await waitForTransaction(tx)
 * console.log('Approval confirmed:', receipt.hash)
 * ```
 */
export async function approveUSDT(
  signer: JsonRpcSigner,
  amount: string
): Promise<TransactionResponse> {
  const usdtContract = getUSDTContract(signer)
  
  // USDT has 18 decimals on BSC
  const amountInWei = parseUnits(amount, 18)
  
  // Execute approval transaction
  const tx = await usdtContract.approve(
    getSDKConfig().contractAddress,
    amountInWei
  )
  
  return tx
}

/**
 * Execute payment transaction (BNB or USDT)
 * @param signer - Ethers signer for transaction signing
 * @param tokenType - Token type ('BNB' or 'USDT')
 * @param amount - Amount to pay (as decimal string, e.g., "0.1" for BNB or "100" for USDT)
 * @returns Transaction response
 * 
 * @example
 * ```typescript
 * // Pay with BNB
 * const signer = await provider.getSigner()
 * const tx = await pay(signer, 'BNB', "0.1")
 * const receipt = await waitForTransaction(tx)
 * 
 * // Pay with USDT (must approve first)
 * await approveUSDT(signer, "100")
 * const tx2 = await pay(signer, 'USDT', "100")
 * const receipt2 = await waitForTransaction(tx2)
 * ```
 */
export async function pay(
  signer: JsonRpcSigner,
  tokenType: TokenType,
  amount: string
): Promise<TransactionResponse> {
  const paymentContract = getPaymentContract(signer)
  const contractTokenType = tokenTypeToContractType(tokenType)
  
  // Parse amount based on token type
  // BNB has 18 decimals, USDT has 18 decimals on BSC
  const amountInWei = parseUnits(amount, 18)
  
  // For BNB payments, send value with transaction
  // For USDT payments, value is 0 (tokens are transferred via approval)
  const txOptions = tokenType === 'BNB' ? { value: amountInWei } : {}
  
  // Execute payment transaction
  const tx = await paymentContract.pay(contractTokenType, amountInWei, txOptions)
  
  return tx
}

/**
 * Wait for transaction confirmation
 * @param tx - Transaction response to wait for
 * @param confirmations - Number of confirmations to wait for (default: 1)
 * @returns Transaction receipt
 * 
 * @example
 * ```typescript
 * const tx = await pay(signer, 'BNB', "0.1")
 * const receipt = await waitForTransaction(tx)
 * console.log('Transaction confirmed:', receipt.hash)
 * console.log('Block number:', receipt.blockNumber)
 * console.log('Gas used:', receipt.gasUsed.toString())
 * ```
 */
export async function waitForTransaction(
  tx: TransactionResponse,
  confirmations: number = 1
): Promise<TransactionReceipt> {
  const receipt = await tx.wait(confirmations)
  
  if (!receipt) {
    throw new Error('Transaction receipt is null')
  }
  
  if (receipt.status === 0) {
    throw new Error('Transaction failed')
  }
  
  return receipt
}

/**
 * Get USDT balance for an address
 * @param signer - Ethers signer
 * @param address - Address to check balance for
 * @returns Balance in USDT (as decimal string)
 * 
 * @example
 * ```typescript
 * const signer = await provider.getSigner()
 * const address = await signer.getAddress()
 * const balance = await getUSDTBalance(signer, address)
 * console.log('USDT Balance:', balance)
 * ```
 */
export async function getUSDTBalance(
  signer: JsonRpcSigner,
  address: string
): Promise<string> {
  const usdtContract = getUSDTContract(signer)
  const balance = await usdtContract.balanceOf(address)
  
  // Format from wei to USDT (18 decimals)
  return formatUnits(balance, 18)
}

/**
 * Check if user has sufficient USDT balance
 * @param signer - Ethers signer
 * @param address - User address
 * @param amount - Required amount (as decimal string)
 * @returns True if balance is sufficient
 */
export async function hasSufficientUSDTBalance(
  signer: JsonRpcSigner,
  address: string,
  amount: string
): Promise<boolean> {
  const balance = await getUSDTBalance(signer, address)
  const balanceNum = parseFloat(balance)
  const amountNum = parseFloat(amount)
  
  return balanceNum >= amountNum
}

/**
 * Check if user has sufficient USDT allowance
 * @param signer - Ethers signer
 * @param owner - Owner address
 * @param amount - Required amount (as decimal string)
 * @returns True if allowance is sufficient
 */
export async function hasSufficientUSDTAllowance(
  signer: JsonRpcSigner,
  owner: string,
  amount: string
): Promise<boolean> {
  const allowance = await checkUSDTAllowance(signer, owner)
  const requiredAmount = parseUnits(amount, 18)
  
  return allowance >= requiredAmount
}

