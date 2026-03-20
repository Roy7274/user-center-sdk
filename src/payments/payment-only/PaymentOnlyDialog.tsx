'use client'

import { useState, useCallback, useEffect } from 'react'
import { usePaymentOnly } from './usePaymentOnly'
import { UserRejectionError, InsufficientBalanceError, NetworkError } from '../../utils/error-handling'
import type { PaymentOnlyInitialRequest, PaymentOnlyResult } from './types'
import type { TokenType } from '../../types/deposit'

export type PaymentOnlyDialogLocale = 'en' | 'zh'

const COPY: Record<
  PaymentOnlyDialogLocale,
  {
    title: string
    orderId: string
    token: string
    amount: string
    amountPlaceholder: string
    pay: string
    payWithAmount: (amount: string, token: TokenType) => string
    closeAria: string
    invalidAmount: string
    paymentFailed: string
    footerNote: string
    errors: {
      userRejected: string
      insufficientBalance: string
      networkError: string
    }
    steps: Record<
      'connecting' | 'approving' | 'paying' | 'waiting_receipt' | 'saving_record' | 'idle',
      string
    >
    stepDescriptions: Record<
      'connecting' | 'approving' | 'paying' | 'waiting_receipt' | 'saving_record',
      string
    >
  }
> = {
  en: {
    title: 'Payment',
    orderId: 'Order ID',
    token: 'Token',
    amount: 'Amount',
    amountPlaceholder: '0.00',
    pay: 'Pay',
    payWithAmount: (a, token) =>
      a ? (token === 'USDT' ? `Pay $${a}` : `Pay ${a} BNB`) : 'Pay',
    closeAria: 'Close',
    invalidAmount: 'Please enter a valid amount',
    paymentFailed: 'Payment failed',
    footerNote: '',
    errors: {
      userRejected: 'You cancelled the transaction. No funds were transferred.',
      insufficientBalance: 'Insufficient balance. Please add funds to your wallet.',
      networkError: 'Network error. Please check your connection and try again.',
    },
    steps: {
      idle: 'Pay',
      connecting: 'Connecting wallet...',
      approving: 'Approving USDT...',
      paying: 'Submitting payment...',
      waiting_receipt: 'Waiting for confirmation...',
      saving_record: 'Saving payment record...',
    },
    stepDescriptions: {
      connecting: 'Please connect your wallet to continue',
      approving: 'Please approve USDT spending in your wallet',
      paying: 'Please confirm the transaction in your wallet',
      waiting_receipt: 'Waiting for on-chain confirmation',
      saving_record: 'Recording payment on the server (no benefit grant)',
    },
  },
  zh: {
    title: '支付',
    orderId: '订单编号',
    token: '支付类型',
    amount: '支付金额',
    amountPlaceholder: '请输入金额',
    pay: '支付',
    payWithAmount: (a, token) => (a ? `支付 ${a} ${token}` : '支付'),
    closeAria: '关闭',
    invalidAmount: '请输入有效金额',
    paymentFailed: '支付失败',
    footerNote: '',
    errors: {
      userRejected: '您已取消授权，未发生任何转账。',
      insufficientBalance: '钱包余额不足，请先充值后再试。',
      networkError: '网络错误，请检查网络连接后重试。',
    },
    steps: {
      idle: '支付',
      connecting: '正在连接钱包…',
      approving: '正在授权 USDT…',
      paying: '正在提交支付…',
      waiting_receipt: '等待链上确认…',
      saving_record: '正在保存支付记录…',
    },
    stepDescriptions: {
      connecting: '请连接钱包后继续',
      approving: '请在钱包中确认 USDT 授权',
      paying: '请在钱包中确认交易',
      waiting_receipt: '等待区块链确认',
      saving_record: '正在写入服务端记录（不触发权益发放）',
    },
  },
}

export interface PaymentOnlyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialRequest: PaymentOnlyInitialRequest
  /** 是否允许用户修改金额（默认 true） */
  allowEditAmount?: boolean
  /** 是否允许切换代币（默认 true） */
  allowTokenChange?: boolean
  /** 界面语言，`zh` 为中文（默认 `en`） */
  locale?: PaymentOnlyDialogLocale
  onSuccess?: (result: PaymentOnlyResult) => void
  onError?: (error: Error) => void
}

function coerceTokenType(t: TokenType | undefined): TokenType {
  return t === 'BNB' ? 'BNB' : 'USDT'
}

export function PaymentOnlyDialog({
  open,
  onOpenChange,
  initialRequest,
  allowEditAmount = true,
  allowTokenChange = true,
  locale = 'en',
  onSuccess,
  onError,
}: PaymentOnlyDialogProps) {
  const { pay, isLoading, step, error: payError } = usePaymentOnly()
  const t = COPY[locale]

  const friendlyError = useCallback((err: Error): string => {
    if (err instanceof UserRejectionError) return t.errors.userRejected
    if (err instanceof InsufficientBalanceError) return t.errors.insufficientBalance
    if (err instanceof NetworkError) return t.errors.networkError
    // 兜底：仍尝试关键词匹配（normalizeError 之前的原始错误走这里）
    const msg = err.message.toLowerCase()
    if (
      msg.includes('user rejected') ||
      msg.includes('user denied') ||
      msg.includes('action_rejected') ||
      msg.includes('ethers-user-denied')
    ) return t.errors.userRejected
    if (msg.includes('insufficient') || msg.includes('balance')) return t.errors.insufficientBalance
    if (msg.includes('network') || msg.includes('fetch')) return t.errors.networkError
    return t.paymentFailed
  }, [t])

  const [tokenType, setTokenType] = useState<TokenType>(() =>
    coerceTokenType(initialRequest.tokenType)
  )
  const [amount, setAmount] = useState(initialRequest.amount ?? '')
  const [customAmount, setCustomAmount] = useState(initialRequest.amount ?? '')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setTokenType(coerceTokenType(initialRequest.tokenType))
      const a = initialRequest.amount ?? ''
      setAmount(a)
      setCustomAmount(a)
      setError(null)
    }
  }, [open, initialRequest.tokenType, initialRequest.amount])

  useEffect(() => {
    if (payError) {
      setError(friendlyError(payError))
    }
  }, [payError, friendlyError])

  const handleCustomAmountChange = useCallback((value: string) => {
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setCustomAmount(value)
      setAmount(value)
      setError(null)
    }
  }, [])

  const handleTokenTypeChange = useCallback((type: TokenType) => {
    setTokenType(type)
    setError(null)
  }, [])

  const handlePay = useCallback(async () => {
    setError(null)

    const amountValue = parseFloat(amount)
    if (!amount || Number.isNaN(amountValue) || amountValue <= 0) {
      setError(t.invalidAmount)
      return
    }

    try {
      const result = await pay({
        userId: initialRequest.userId,
        tokenType,
        amount,
        orderId: initialRequest.orderId,
        orderName: initialRequest.orderName,
        metadata: initialRequest.metadata,
      })
      onSuccess?.(result)
      onOpenChange(false)
    } catch (err) {
      const e = err instanceof Error ? err : new Error(t.paymentFailed)
      setError(friendlyError(e))
      onError?.(e)
    }
  }, [amount, tokenType, pay, initialRequest, onSuccess, onError, onOpenChange, t, friendlyError])

  const getStepText = useCallback(() => t.steps[step === 'idle' ? 'idle' : step], [t, step])

  const getStepDescription = useCallback((): string | null => {
    if (step === 'idle') return null
    return t.stepDescriptions[step] ?? null
  }, [t, step])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl" style={{ color: '#111827' }}>
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          disabled={isLoading}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label={t.closeAria}
        >
          <svg
            className="h-5 w-5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h2 className="mb-2 text-2xl font-bold text-gray-900">{t.title}</h2>
        <p className="mb-4 text-sm text-gray-600">{initialRequest.orderName}</p>

        <div className="mb-4 rounded-md bg-gray-50 p-3 text-sm text-gray-700">
          <div className="flex justify-between gap-2">
            <span className="text-gray-500">{t.orderId}</span>
            <span className="max-w-[60%] truncate font-mono text-xs text-gray-800">{initialRequest.orderId}</span>
          </div>
        </div>

        <div className="mb-6">
          <label className="mb-2 block text-sm font-medium text-gray-700">{t.token}</label>
          {allowTokenChange ? (
            <div className="flex space-x-2 rounded-lg bg-gray-100 p-1">
              <button
                type="button"
                onClick={() => handleTokenTypeChange('USDT')}
                disabled={isLoading}
                className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                  tokenType === 'USDT'
                    ? 'bg-white shadow'
                    : 'hover:text-gray-900'
                }`}
                style={{ color: tokenType === 'USDT' ? '#111827' : '#4b5563' }}
              >
                USDT
              </button>
              <button
                type="button"
                onClick={() => handleTokenTypeChange('BNB')}
                disabled={isLoading}
                className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                  tokenType === 'BNB'
                    ? 'bg-white shadow'
                    : 'hover:text-gray-900'
                }`}
                style={{ color: tokenType === 'BNB' ? '#111827' : '#4b5563' }}
              >
                BNB
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-4 py-2">
              <span className="text-sm font-semibold" style={{ color: '#111827' }}>{tokenType}</span>

            </div>
          )}
        </div>

        <div className="mb-6">
          <label className="mb-2 block text-sm font-medium text-gray-700" htmlFor="payment-only-amount">
            {t.amount}
          </label>
          <div className="flex items-center rounded-md border border-gray-300 bg-white focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
            <span className="select-none pl-4 text-sm text-gray-500" aria-hidden>$</span>
            <input
              id="payment-only-amount"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={customAmount}
              onChange={(e) => handleCustomAmountChange(e.target.value)}
              placeholder={t.amountPlaceholder}
              disabled={isLoading || !allowEditAmount}
              readOnly={!allowEditAmount}
              className="min-w-0 flex-1 bg-transparent py-2 pl-2 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none disabled:cursor-not-allowed disabled:text-gray-700"
            />
          </div>
        </div>

        {error && (
          <div
              className="mb-4 flex items-start gap-2 rounded-md border border-red-300 bg-red-100 p-3 text-sm font-medium"
              style={{ color: '#7f1d1d' }}
            >
              <svg
                className="mt-0.5 h-4 w-4 shrink-0"
                style={{ color: '#ef4444' }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              <span style={{ color: '#7f1d1d' }}>{error}</span>
            </div>
        )}

        {isLoading && step !== 'idle' && (
          <div className="mb-4 rounded-md bg-blue-50 p-3">
            <div className="flex items-center space-x-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
              <div>
                <p className="text-sm font-medium text-blue-900">{getStepText()}</p>
                {getStepDescription() && (
                  <p className="text-xs text-blue-700">{getStepDescription()}</p>
                )}
              </div>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={handlePay}
          disabled={isLoading || !amount}
          className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? getStepText() : t.payWithAmount(amount, tokenType)}
        </button>

        <p className="mt-4 text-center text-xs text-gray-500">{t.footerNote}</p>
      </div>
    </div>
  )
}
