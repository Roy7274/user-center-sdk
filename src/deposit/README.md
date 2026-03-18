# Deposit Module

The deposit module provides utilities for interacting with the payment smart contract on BSC (Binance Smart Chain). It handles both BNB and USDT payments with full transaction management.

## Features

- **Contract Interaction**: Pre-configured ABIs for ERC20 tokens and payment contract
- **USDT Approval**: Approve USDT spending for the payment contract
- **Payment Execution**: Execute BNB and USDT payments
- **Transaction Management**: Wait for confirmations and handle receipts
- **Balance Queries**: Check USDT balances and allowances

## Usage

### Basic Payment Flow

```typescript
import { useWeb3 } from '@ai-agent/user-center-sdk'
import { approveUSDT, pay, waitForTransaction } from '@ai-agent/user-center-sdk'

function PaymentComponent() {
  const { signer, address } = useWeb3()

  const handleBNBPayment = async () => {
    if (!signer) return

    try {
      // Execute BNB payment
      const tx = await pay(signer, 'BNB', '0.1')
      console.log('Transaction sent:', tx.hash)

      // Wait for confirmation
      const receipt = await waitForTransaction(tx)
      console.log('Payment confirmed:', receipt.hash)
    } catch (error) {
      console.error('Payment failed:', error)
    }
  }

  const handleUSDTPayment = async () => {
    if (!signer || !address) return

    try {
      // Step 1: Approve USDT spending
      const approveTx = await approveUSDT(signer, '100')
      console.log('Approval sent:', approveTx.hash)
      
      await waitForTransaction(approveTx)
      console.log('Approval confirmed')

      // Step 2: Execute USDT payment
      const payTx = await pay(signer, 'USDT', '100')
      console.log('Payment sent:', payTx.hash)

      const receipt = await waitForTransaction(payTx)
      console.log('Payment confirmed:', receipt.hash)
    } catch (error) {
      console.error('Payment failed:', error)
    }
  }

  return (
    <div>
      <button onClick={handleBNBPayment}>Pay with BNB</button>
      <button onClick={handleUSDTPayment}>Pay with USDT</button>
    </div>
  )
}
```

### Check Balances and Allowances

```typescript
import { useWeb3 } from '@ai-agent/user-center-sdk'
import {
  getUSDTBalance,
  hasSufficientUSDTBalance,
  hasSufficientUSDTAllowance,
} from '@ai-agent/user-center-sdk'

async function checkPaymentReadiness(signer, address, amount) {
  // Check USDT balance
  const balance = await getUSDTBalance(signer, address)
  console.log('USDT Balance:', balance)

  // Check if balance is sufficient
  const hasBalance = await hasSufficientUSDTBalance(signer, address, amount)
  if (!hasBalance) {
    throw new Error('Insufficient USDT balance')
  }

  // Check if allowance is sufficient
  const hasAllowance = await hasSufficientUSDTAllowance(signer, address, amount)
  if (!hasAllowance) {
    console.log('Need to approve USDT spending')
    return false
  }

  return true
}
```

### Advanced: Direct Contract Access

```typescript
import { getUSDTContract, getPaymentContract } from '@ai-agent/user-center-sdk'

async function advancedContractInteraction(signer) {
  // Get contract instances
  const usdtContract = getUSDTContract(signer)
  const paymentContract = getPaymentContract(signer)

  // Call contract methods directly
  const decimals = await usdtContract.decimals()
  console.log('USDT Decimals:', decimals)

  // Listen to payment events
  paymentContract.on('Payment', (user, tokenType, amount, timestamp) => {
    console.log('Payment event:', { user, tokenType, amount, timestamp })
  })
}
```

## API Reference

### Contract Utilities

#### `approveUSDT(signer, amount)`

Approve USDT spending for the payment contract.

- **Parameters:**
  - `signer: JsonRpcSigner` - Ethers signer for transaction signing
  - `amount: string` - Amount to approve (e.g., "100.5")
- **Returns:** `Promise<TransactionResponse>`

#### `pay(signer, tokenType, amount)`

Execute a payment transaction (BNB or USDT).

- **Parameters:**
  - `signer: JsonRpcSigner` - Ethers signer for transaction signing
  - `tokenType: 'BNB' | 'USDT'` - Token type
  - `amount: string` - Amount to pay (e.g., "0.1" for BNB, "100" for USDT)
- **Returns:** `Promise<TransactionResponse>`

#### `waitForTransaction(tx, confirmations?)`

Wait for transaction confirmation.

- **Parameters:**
  - `tx: TransactionResponse` - Transaction to wait for
  - `confirmations?: number` - Number of confirmations (default: 1)
- **Returns:** `Promise<TransactionReceipt>`
- **Throws:** Error if transaction fails or receipt is null

#### `getUSDTBalance(signer, address)`

Get USDT balance for an address.

- **Parameters:**
  - `signer: JsonRpcSigner` - Ethers signer
  - `address: string` - Address to check
- **Returns:** `Promise<string>` - Balance as decimal string

#### `hasSufficientUSDTBalance(signer, address, amount)`

Check if user has sufficient USDT balance.

- **Parameters:**
  - `signer: JsonRpcSigner` - Ethers signer
  - `address: string` - User address
  - `amount: string` - Required amount
- **Returns:** `Promise<boolean>`

#### `hasSufficientUSDTAllowance(signer, owner, amount)`

Check if user has sufficient USDT allowance.

- **Parameters:**
  - `signer: JsonRpcSigner` - Ethers signer
  - `owner: string` - Owner address
  - `amount: string` - Required amount
- **Returns:** `Promise<boolean>`

#### `checkUSDTAllowance(signer, owner)`

Get current USDT allowance for the payment contract.

- **Parameters:**
  - `signer: JsonRpcSigner` - Ethers signer
  - `owner: string` - Owner address
- **Returns:** `Promise<bigint>` - Allowance in wei

### Contract Instances

#### `getUSDTContract(signer)`

Get USDT contract instance.

- **Parameters:**
  - `signer: JsonRpcSigner` - Ethers signer
- **Returns:** `Contract` - USDT contract instance

#### `getPaymentContract(signer)`

Get payment contract instance.

- **Parameters:**
  - `signer: JsonRpcSigner` - Ethers signer
- **Returns:** `Contract` - Payment contract instance

### Constants

#### `ERC20_ABI`

Minimal ERC20 ABI for token interactions:
- `approve(address spender, uint256 amount)`
- `allowance(address owner, address spender)`
- `balanceOf(address account)`
- `decimals()`

#### `PAYMENT_CONTRACT_ABI`

Payment contract ABI:
- `pay(uint8 tokenType, uint256 amount) payable`
- `event Payment(address indexed user, uint8 tokenType, uint256 amount, uint256 timestamp)`

#### `ContractTokenType`

Enum for contract token types:
- `BNB = 0`
- `USDT = 1`

## Error Handling

All contract functions may throw errors in the following cases:

- **Wallet not connected**: User hasn't connected their wallet
- **Insufficient balance**: User doesn't have enough tokens
- **Insufficient allowance**: USDT allowance not approved
- **User rejection**: User rejected the transaction in wallet
- **Transaction failed**: On-chain transaction reverted
- **Network error**: RPC connection issues

Always wrap contract calls in try-catch blocks:

```typescript
try {
  const tx = await pay(signer, 'BNB', '0.1')
  const receipt = await waitForTransaction(tx)
  console.log('Success:', receipt.hash)
} catch (error) {
  if (error.code === 'ACTION_REJECTED') {
    console.log('User rejected transaction')
  } else if (error.code === 'INSUFFICIENT_FUNDS') {
    console.log('Insufficient balance')
  } else {
    console.error('Transaction failed:', error)
  }
}
```

## Testing

The module includes comprehensive unit tests covering:

- Token type conversion
- Contract instance creation
- USDT approval flow
- BNB and USDT payment execution
- Transaction confirmation handling
- Balance and allowance queries
- Error cases (null receipts, failed transactions)

Run tests:

```bash
npm test src/deposit/contract.test.ts
```

## Configuration

The contract utilities use the SDK configuration for:

- `contractAddress`: Payment contract address
- `usdtAddress`: USDT token address
- `bscNetwork`: Network selection (mainnet/testnet)

Ensure these are configured via `initSDKConfig()` before using the contract utilities.

## Notes

- All amounts are handled as decimal strings (e.g., "0.1", "100.5")
- USDT uses 18 decimals on BSC (not 6 like on Ethereum)
- BNB payments include the value in the transaction
- USDT payments require prior approval
- Transactions default to 1 confirmation but can be customized
- Contract instances are created on-demand (not cached)

