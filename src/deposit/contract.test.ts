/**
 * Tests for Payment Contract Interaction Utilities
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Contract, parseUnits, formatUnits } from 'ethers'
import {
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
import { initSDKConfig, resetSDKConfig } from '../config/sdk-config'
import type { JsonRpcSigner, TransactionResponse, TransactionReceipt } from 'ethers'

// Mock ethers Contract
vi.mock('ethers', async () => {
  const actual = await vi.importActual('ethers')
  return {
    ...actual,
    Contract: vi.fn(),
  }
})

describe('Payment Contract Utilities', () => {
  const mockConfig = {
    userCenterUrl: 'https://api.example.com',
    appId: 'test-app',
    bscNetwork: 'testnet' as const,
    contractAddress: '0x1234567890123456789012345678901234567890',
    usdtAddress: '0x0987654321098765432109876543210987654321',
  }

  beforeEach(() => {
    initSDKConfig(mockConfig)
    vi.clearAllMocks()
  })

  afterEach(() => {
    resetSDKConfig()
  })

  describe('tokenTypeToContractType', () => {
    it('should convert BNB to ContractTokenType.BNB', () => {
      expect(tokenTypeToContractType('BNB')).toBe(ContractTokenType.BNB)
      expect(tokenTypeToContractType('BNB')).toBe(0)
    })

    it('should convert USDT to ContractTokenType.USDT', () => {
      expect(tokenTypeToContractType('USDT')).toBe(ContractTokenType.USDT)
      expect(tokenTypeToContractType('USDT')).toBe(1)
    })
  })

  describe('getUSDTContract', () => {
    it('should create USDT contract with correct address and ABI', () => {
      const mockSigner = {} as JsonRpcSigner

      getUSDTContract(mockSigner)

      expect(Contract).toHaveBeenCalledWith(
        mockConfig.usdtAddress,
        ERC20_ABI,
        mockSigner
      )
    })
  })

  describe('getPaymentContract', () => {
    it('should create payment contract with correct address and ABI', () => {
      const mockSigner = {} as JsonRpcSigner

      getPaymentContract(mockSigner)

      expect(Contract).toHaveBeenCalledWith(
        mockConfig.contractAddress,
        PAYMENT_CONTRACT_ABI,
        mockSigner
      )
    })
  })

  describe('checkUSDTAllowance', () => {
    it('should return current allowance', async () => {
      const mockAllowance = parseUnits('100', 18)
      const mockContract = {
        allowance: vi.fn().mockResolvedValue(mockAllowance),
      }
      
      vi.mocked(Contract).mockReturnValue(mockContract as any)

      const mockSigner = {} as JsonRpcSigner
      const owner = '0xabcdef1234567890abcdef1234567890abcdef12'

      const allowance = await checkUSDTAllowance(mockSigner, owner)

      expect(allowance).toBe(mockAllowance)
      expect(mockContract.allowance).toHaveBeenCalledWith(
        owner,
        mockConfig.contractAddress
      )
    })
  })

  describe('approveUSDT', () => {
    it('should approve USDT spending with correct amount', async () => {
      const mockTx = { hash: '0xabc123' } as TransactionResponse
      const mockContract = {
        approve: vi.fn().mockResolvedValue(mockTx),
      }
      
      vi.mocked(Contract).mockReturnValue(mockContract as any)

      const mockSigner = {} as JsonRpcSigner
      const amount = '100.5'

      const tx = await approveUSDT(mockSigner, amount)

      expect(tx).toBe(mockTx)
      expect(mockContract.approve).toHaveBeenCalledWith(
        mockConfig.contractAddress,
        parseUnits(amount, 18)
      )
    })

    it('should handle decimal amounts correctly', async () => {
      const mockTx = { hash: '0xabc123' } as TransactionResponse
      const mockContract = {
        approve: vi.fn().mockResolvedValue(mockTx),
      }
      
      vi.mocked(Contract).mockReturnValue(mockContract as any)

      const mockSigner = {} as JsonRpcSigner

      await approveUSDT(mockSigner, '0.123456')

      expect(mockContract.approve).toHaveBeenCalledWith(
        mockConfig.contractAddress,
        parseUnits('0.123456', 18)
      )
    })
  })

  describe('pay', () => {
    it('should execute BNB payment with value', async () => {
      const mockTx = { hash: '0xabc123' } as TransactionResponse
      const mockContract = {
        pay: vi.fn().mockResolvedValue(mockTx),
      }
      
      vi.mocked(Contract).mockReturnValue(mockContract as any)

      const mockSigner = {} as JsonRpcSigner
      const amount = '0.1'

      const tx = await pay(mockSigner, 'BNB', amount)

      expect(tx).toBe(mockTx)
      expect(mockContract.pay).toHaveBeenCalledWith(
        ContractTokenType.BNB,
        parseUnits(amount, 18),
        { value: parseUnits(amount, 18) }
      )
    })

    it('should execute USDT payment without value', async () => {
      const mockTx = { hash: '0xabc123' } as TransactionResponse
      const mockContract = {
        pay: vi.fn().mockResolvedValue(mockTx),
      }
      
      vi.mocked(Contract).mockReturnValue(mockContract as any)

      const mockSigner = {} as JsonRpcSigner
      const amount = '100'

      const tx = await pay(mockSigner, 'USDT', amount)

      expect(tx).toBe(mockTx)
      expect(mockContract.pay).toHaveBeenCalledWith(
        ContractTokenType.USDT,
        parseUnits(amount, 18),
        {}
      )
    })

    it('should handle decimal amounts for BNB', async () => {
      const mockTx = { hash: '0xabc123' } as TransactionResponse
      const mockContract = {
        pay: vi.fn().mockResolvedValue(mockTx),
      }
      
      vi.mocked(Contract).mockReturnValue(mockContract as any)

      const mockSigner = {} as JsonRpcSigner
      const amount = '0.00123'

      await pay(mockSigner, 'BNB', amount)

      const expectedAmount = parseUnits(amount, 18)
      expect(mockContract.pay).toHaveBeenCalledWith(
        ContractTokenType.BNB,
        expectedAmount,
        { value: expectedAmount }
      )
    })
  })

  describe('waitForTransaction', () => {
    it('should wait for transaction confirmation', async () => {
      const mockReceipt = {
        hash: '0xabc123',
        blockNumber: 12345,
        status: 1,
        gasUsed: BigInt(21000),
      } as TransactionReceipt

      const mockTx = {
        hash: '0xabc123',
        wait: vi.fn().mockResolvedValue(mockReceipt),
      } as unknown as TransactionResponse

      const receipt = await waitForTransaction(mockTx)

      expect(receipt).toBe(mockReceipt)
      expect(mockTx.wait).toHaveBeenCalledWith(1)
    })

    it('should wait for custom number of confirmations', async () => {
      const mockReceipt = {
        hash: '0xabc123',
        blockNumber: 12345,
        status: 1,
      } as TransactionReceipt

      const mockTx = {
        hash: '0xabc123',
        wait: vi.fn().mockResolvedValue(mockReceipt),
      } as unknown as TransactionResponse

      await waitForTransaction(mockTx, 3)

      expect(mockTx.wait).toHaveBeenCalledWith(3)
    })

    it('should throw error if receipt is null', async () => {
      const mockTx = {
        hash: '0xabc123',
        wait: vi.fn().mockResolvedValue(null),
      } as unknown as TransactionResponse

      await expect(waitForTransaction(mockTx)).rejects.toThrow(
        'Transaction receipt is null'
      )
    })

    it('should throw error if transaction failed', async () => {
      const mockReceipt = {
        hash: '0xabc123',
        blockNumber: 12345,
        status: 0, // Failed
      } as TransactionReceipt

      const mockTx = {
        hash: '0xabc123',
        wait: vi.fn().mockResolvedValue(mockReceipt),
      } as unknown as TransactionResponse

      await expect(waitForTransaction(mockTx)).rejects.toThrow(
        'Transaction failed'
      )
    })
  })

  describe('getUSDTBalance', () => {
    it('should return formatted USDT balance', async () => {
      const mockBalance = parseUnits('250.5', 18)
      const mockContract = {
        balanceOf: vi.fn().mockResolvedValue(mockBalance),
      }
      
      vi.mocked(Contract).mockReturnValue(mockContract as any)

      const mockSigner = {} as JsonRpcSigner
      const address = '0xabcdef1234567890abcdef1234567890abcdef12'

      const balance = await getUSDTBalance(mockSigner, address)

      expect(balance).toBe('250.5')
      expect(mockContract.balanceOf).toHaveBeenCalledWith(address)
    })

    it('should handle zero balance', async () => {
      const mockContract = {
        balanceOf: vi.fn().mockResolvedValue(BigInt(0)),
      }
      
      vi.mocked(Contract).mockReturnValue(mockContract as any)

      const mockSigner = {} as JsonRpcSigner
      const address = '0xabcdef1234567890abcdef1234567890abcdef12'

      const balance = await getUSDTBalance(mockSigner, address)

      expect(balance).toBe('0.0')
    })
  })

  describe('hasSufficientUSDTBalance', () => {
    it('should return true if balance is sufficient', async () => {
      const mockBalance = parseUnits('100', 18)
      const mockContract = {
        balanceOf: vi.fn().mockResolvedValue(mockBalance),
      }
      
      vi.mocked(Contract).mockReturnValue(mockContract as any)

      const mockSigner = {} as JsonRpcSigner
      const address = '0xabcdef1234567890abcdef1234567890abcdef12'

      const result = await hasSufficientUSDTBalance(mockSigner, address, '50')

      expect(result).toBe(true)
    })

    it('should return false if balance is insufficient', async () => {
      const mockBalance = parseUnits('30', 18)
      const mockContract = {
        balanceOf: vi.fn().mockResolvedValue(mockBalance),
      }
      
      vi.mocked(Contract).mockReturnValue(mockContract as any)

      const mockSigner = {} as JsonRpcSigner
      const address = '0xabcdef1234567890abcdef1234567890abcdef12'

      const result = await hasSufficientUSDTBalance(mockSigner, address, '50')

      expect(result).toBe(false)
    })

    it('should return true if balance equals required amount', async () => {
      const mockBalance = parseUnits('100', 18)
      const mockContract = {
        balanceOf: vi.fn().mockResolvedValue(mockBalance),
      }
      
      vi.mocked(Contract).mockReturnValue(mockContract as any)

      const mockSigner = {} as JsonRpcSigner
      const address = '0xabcdef1234567890abcdef1234567890abcdef12'

      const result = await hasSufficientUSDTBalance(mockSigner, address, '100')

      expect(result).toBe(true)
    })
  })

  describe('hasSufficientUSDTAllowance', () => {
    it('should return true if allowance is sufficient', async () => {
      const mockAllowance = parseUnits('100', 18)
      const mockContract = {
        allowance: vi.fn().mockResolvedValue(mockAllowance),
      }
      
      vi.mocked(Contract).mockReturnValue(mockContract as any)

      const mockSigner = {} as JsonRpcSigner
      const owner = '0xabcdef1234567890abcdef1234567890abcdef12'

      const result = await hasSufficientUSDTAllowance(mockSigner, owner, '50')

      expect(result).toBe(true)
    })

    it('should return false if allowance is insufficient', async () => {
      const mockAllowance = parseUnits('30', 18)
      const mockContract = {
        allowance: vi.fn().mockResolvedValue(mockAllowance),
      }
      
      vi.mocked(Contract).mockReturnValue(mockContract as any)

      const mockSigner = {} as JsonRpcSigner
      const owner = '0xabcdef1234567890abcdef1234567890abcdef12'

      const result = await hasSufficientUSDTAllowance(mockSigner, owner, '50')

      expect(result).toBe(false)
    })

    it('should return true if allowance equals required amount', async () => {
      const mockAllowance = parseUnits('100', 18)
      const mockContract = {
        allowance: vi.fn().mockResolvedValue(mockAllowance),
      }
      
      vi.mocked(Contract).mockReturnValue(mockContract as any)

      const mockSigner = {} as JsonRpcSigner
      const owner = '0xabcdef1234567890abcdef1234567890abcdef12'

      const result = await hasSufficientUSDTAllowance(mockSigner, owner, '100')

      expect(result).toBe(true)
    })
  })

  describe('Contract ABIs', () => {
    it('should have correct ERC20 ABI', () => {
      expect(ERC20_ABI).toEqual([
        'function approve(address spender, uint256 amount) returns (bool)',
        'function allowance(address owner, address spender) view returns (uint256)',
        'function balanceOf(address account) view returns (uint256)',
        'function decimals() view returns (uint8)',
      ])
    })

    it('should have correct Payment Contract ABI', () => {
      expect(PAYMENT_CONTRACT_ABI).toEqual([
        'function pay(uint8 tokenType, uint256 amount) payable',
        'event Payment(address indexed user, uint8 tokenType, uint256 amount, uint256 timestamp)',
      ])
    })
  })
})

