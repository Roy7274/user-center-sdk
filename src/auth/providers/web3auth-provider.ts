/**
 * Web3Auth Credentials Provider for NextAuth
 * 
 * This provider handles authentication via Web3Auth, supporting social login
 * and wallet-based authentication. It integrates with the User Center API
 * to create or retrieve user accounts based on wallet addresses.
 * 
 * @module auth/providers/web3auth-provider
 */

import CredentialsProvider from 'next-auth/providers/credentials'
import type { CredentialsConfig } from 'next-auth/providers/credentials'
import { getSDKConfig } from '../../config/sdk-config'
import type { AuthResponse } from '../../types/auth'

/**
 * Create Web3Auth credentials provider for NextAuth
 * 
 * This provider authenticates users via Web3Auth by:
 * 1. Receiving wallet address and user info from Web3Auth
 * 2. Calling User Center /auth/web3Login API
 * 3. Returning user data and access token for session creation
 * 
 * @returns NextAuth CredentialsProvider configured for Web3Auth
 * 
 * @example
 * ```typescript
 * import { createWeb3AuthProvider } from '@ai-agent/user-center-sdk/auth'
 * 
 * const authOptions = {
 *   providers: [
 *     createWeb3AuthProvider(),
 *     // ... other providers
 *   ]
 * }
 * ```
 */
export function createWeb3AuthProvider(): CredentialsConfig {
  return CredentialsProvider({
    id: 'web3auth',
    name: 'Web3Auth',
    
    credentials: {
      walletAddress: { 
        label: 'Wallet Address', 
        type: 'text',
        placeholder: '0x...' 
      },
      userInfo: { 
        label: 'User Info', 
        type: 'text' 
      },
    },

    async authorize(credentials) {
      if (!credentials?.walletAddress) {
        throw new Error('Wallet address is required')
      }

      try {
        const config = getSDKConfig()
        
        // Parse user info if provided
        let userInfo
        if (credentials.userInfo) {
          try {
            userInfo = JSON.parse(credentials.userInfo)
          } catch (error) {
            console.warn('Failed to parse userInfo:', error)
            userInfo = {}
          }
        }

        // Call User Center API to authenticate with Web3Auth
        const response = await fetch(`${config.userCenterUrl}/auth/web3Login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-App-Id': config.appId,
          },
          body: JSON.stringify({
            walletAddress: credentials.walletAddress,
            email: userInfo?.email,
            name: userInfo?.name,
            profileImage: userInfo?.profileImage,
            provider: userInfo?.typeOfLogin || userInfo?.verifier || 'web3auth',
            verifier: userInfo?.verifier,
            verifierId: userInfo?.verifierId,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(
            errorData.message || `Web3Auth login failed: ${response.status}`
          )
        }

        const data: AuthResponse = await response.json()

        // Return user object that will be passed to JWT callback
        return {
          id: data.user.id,
          email: data.user.email,
          name: data.user.name,
          image: data.user.profileImage,
          type: data.user.type,
          walletAddress: data.user.walletAddress,
          profileImage: data.user.profileImage,
          provider: data.user.provider,
          roles: data.user.roles,
          permissions: data.user.permissions,
          createdAt: data.user.createdAt,
          access_token: data.access_token,
          refresh_token: data.refresh_token,
        }
      } catch (error) {
        console.error('Web3Auth provider error:', error)
        
        // Re-throw with user-friendly message
        if (error instanceof Error) {
          throw error
        }
        
        throw new Error('Failed to authenticate with Web3Auth')
      }
    },
  })
}

