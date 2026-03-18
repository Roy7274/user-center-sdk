/**
 * Deposit module exports
 * 
 * This module provides utilities for handling on-chain payments and deposits
 * on BSC (Binance Smart Chain).
 */

export {
  // Contract interaction utilities
  ERC20_ABI,
  PAYMENT_CONTRACT_ABI,
  ContractTokenType,
  tokenTypeToContractType,
  getUSDTContract,
  getPaymentContract,
  checkUSDTAllowance,
  approveUSDT,
  pay,
  waitForTransaction,
  getUSDTBalance,
  hasSufficientUSDTBalance,
  hasSufficientUSDTAllowance,
} from './contract'
