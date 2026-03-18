/**
 * LoginDialog Component
 * 
 * A comprehensive authentication dialog that supports multiple login methods:
 * - Web3Auth (social login + wallet connection)
 * - User Center (redirect to external login page)
 * - Guest login (temporary anonymous access)
 * 
 * The component automatically adapts based on SDK configuration, showing only
 * enabled authentication methods.
 * 
 * @module components/LoginDialog
 */

'use client'

import { useState, useCallback } from 'react'
import { signIn } from 'next-auth/react'
import { useWeb3Auth } from './Web3AuthProvider'
import { getSDKConfig } from '../config/sdk-config'
import type { Session } from '../types/auth'

/**
 * Available login tab types
 */
export type LoginTab = 'web3auth' | 'usercenter' | 'guest'

/**
 * LoginDialog component props
 */
export interface LoginDialogProps {
  /** Whether the dialog is open */
  open: boolean
  /** Callback when dialog open state changes */
  onOpenChange: (open: boolean) => void
  /** Callback when login succeeds */
  onSuccess?: (session: Session) => void
  /** Callback when login fails */
  onError?: (error: Error) => void
  /** Default tab to show when dialog opens */
  defaultTab?: LoginTab
}

/**
 * LoginDialog - Multi-method authentication dialog
 * 
 * Provides a tabbed interface for different authentication methods.
 * The available tabs are determined by SDK configuration:
 * - Web3Auth tab: shown if `enableWeb3Auth` is not false
 * - User Center tab: always shown
 * - Guest tab: shown if `enableGuestLogin` is not false
 * 
 * @param props - Component props
 * @returns JSX element
 * 
 * @example
 * ```typescript
 * function App() {
 *   const [showLogin, setShowLogin] = useState(false)
 * 
 *   const handleLoginSuccess = (session: Session) => {
 *     console.log('User logged in:', session.user.name)
 *     setShowLogin(false)
 *   }
 * 
 *   const handleLoginError = (error: Error) => {
 *     console.error('Login failed:', error.message)
 *   }
 * 
 *   return (
 *     <div>
 *       <button onClick={() => setShowLogin(true)}>
 *         Login
 *       </button>
 *       
 *       <LoginDialog
 *         open={showLogin}
 *         onOpenChange={setShowLogin}
 *         onSuccess={handleLoginSuccess}
 *         onError={handleLoginError}
 *         defaultTab="web3auth"
 *       />
 *     </div>
 *   )
 * }
 * ```
 */
export function LoginDialog({
  open,
  onOpenChange,
  onSuccess,
  onError,
  defaultTab = 'web3auth',
}: LoginDialogProps) {
  const config = getSDKConfig()
  const web3Auth = useWeb3Auth()
  
  const [activeTab, setActiveTab] = useState<LoginTab>(defaultTab)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [guestId, setGuestId] = useState('')

  // Determine available tabs based on configuration
  const availableTabs: LoginTab[] = []
  if (config.enableWeb3Auth !== false) availableTabs.push('web3auth')
  availableTabs.push('usercenter')
  if (config.enableGuestLogin !== false) availableTabs.push('guest')

  // Handle Web3Auth login
  const handleWeb3AuthLogin = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Connect to Web3Auth
      await web3Auth.connect()

      // Get wallet address and user info
      const walletAddress = web3Auth.walletAddress
      const userInfo = web3Auth.userInfo

      if (!walletAddress) {
        throw new Error('Failed to get wallet address from Web3Auth')
      }

      // Sign in with NextAuth
      const result = await signIn('web3auth', {
        walletAddress,
        userInfo: JSON.stringify(userInfo),
        redirect: false,
      })

      if (result?.error) {
        throw new Error(result.error)
      }

      if (result?.ok) {
        onSuccess?.(result as any)
        onOpenChange(false)
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Web3Auth login failed')
      setError(error.message)
      onError?.(error)
    } finally {
      setIsLoading(false)
    }
  }, [web3Auth, onSuccess, onError, onOpenChange])

  // Handle User Center login
  const handleUserCenterLogin = useCallback(() => {
    const redirectUrl = `${window.location.origin}/auth/callback`
    const loginUrl = `${config.userCenterUrl}/login?redirect=${encodeURIComponent(redirectUrl)}&app_id=${config.appId}`
    
    // Redirect to User Center login page
    window.location.href = loginUrl
  }, [config])

  // Handle Guest login
  const handleGuestLogin = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Generate guest ID if not provided
      const finalGuestId = guestId || `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      // Sign in with NextAuth
      const result = await signIn('guest', {
        guestId: finalGuestId,
        redirect: false,
      })

      if (result?.error) {
        throw new Error(result.error)
      }

      if (result?.ok) {
        onSuccess?.(result as any)
        onOpenChange(false)
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Guest login failed')
      setError(error.message)
      onError?.(error)
    } finally {
      setIsLoading(false)
    }
  }, [guestId, onSuccess, onError, onOpenChange])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        {/* Close button */}
        <button
          onClick={() => onOpenChange(false)}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
          aria-label="Close"
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

        {/* Title */}
        <h2 className="mb-6 text-2xl font-bold text-gray-900">Sign In</h2>

        {/* Tabs */}
        <div className="mb-6 flex space-x-1 rounded-lg bg-gray-100 p-1">
          {availableTabs.includes('web3auth') && (
            <button
              onClick={() => setActiveTab('web3auth')}
              className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                activeTab === 'web3auth'
                  ? 'bg-white text-gray-900 shadow'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Web3Auth
            </button>
          )}
          {availableTabs.includes('usercenter') && (
            <button
              onClick={() => setActiveTab('usercenter')}
              className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                activeTab === 'usercenter'
                  ? 'bg-white text-gray-900 shadow'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              User Center
            </button>
          )}
          {availableTabs.includes('guest') && (
            <button
              onClick={() => setActiveTab('guest')}
              className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                activeTab === 'guest'
                  ? 'bg-white text-gray-900 shadow'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Guest
            </button>
          )}
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800">
            {error}
          </div>
        )}

        {/* Tab content */}
        <div className="space-y-4">
          {/* Web3Auth tab */}
          {activeTab === 'web3auth' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Connect with your social account or crypto wallet using Web3Auth.
              </p>
              <button
                onClick={handleWeb3AuthLogin}
                disabled={isLoading}
                className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading ? 'Connecting...' : 'Connect with Web3Auth'}
              </button>
            </div>
          )}

          {/* User Center tab */}
          {activeTab === 'usercenter' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Sign in with your User Center account. You will be redirected to the login page.
              </p>
              <button
                onClick={handleUserCenterLogin}
                disabled={isLoading}
                className="w-full rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Go to User Center Login
              </button>
            </div>
          )}

          {/* Guest tab */}
          {activeTab === 'guest' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Continue as a guest without creating an account. You can optionally provide a guest ID.
              </p>
              <input
                type="text"
                value={guestId}
                onChange={(e) => setGuestId(e.target.value)}
                placeholder="Guest ID (optional)"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                onClick={handleGuestLogin}
                disabled={isLoading}
                className="w-full rounded-md bg-gray-600 px-4 py-2 text-white hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading ? 'Signing in...' : 'Continue as Guest'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
