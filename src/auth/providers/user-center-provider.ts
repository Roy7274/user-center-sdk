/**
 * User Center Credentials Provider for NextAuth
 * 
 * This provider handles authentication via User Center token-based login.
 * It verifies tokens received from User Center redirect URLs and creates
 * authenticated sessions.
 * 
 * @module auth/providers/user-center-provider
 */

import CredentialsProvider from 'next-auth/providers/credentials'
import type { CredentialsConfig } from 'next-auth/providers/credentials'
import { getSDKConfig } from '../../config/sdk-config'
import type { TokenVerifyResponse } from '../../types/auth'

/**
 * Create User Center credentials provider for NextAuth
 * 
 * This provider authenticates users via User Center by:
 * 1. Receiving a token from User Center redirect URL
 * 2. Calling User Center /auth/verify API to validate the token
 * 3. Returning user data and access token for session creation
 * 
 * @returns NextAuth CredentialsProvider configured for User Center
 * 
 * @example
 * ```typescript
 * import { createUserCenterProvider } from '@ai-agent/user-center-sdk/auth'
 * 
 * const authOptions = {
 *   providers: [
 *     createUserCenterProvider(),
 *     // ... other providers
 *   ]
 * }
 * ```
 */
export function createUserCenterProvider(): CredentialsConfig {
  return CredentialsProvider({
    id: 'usercenter',
    name: 'User Center',
    
    credentials: {
      token: { 
        label: 'Token', 
        type: 'text',
        placeholder: 'Token from User Center' 
      },
      redirectUrl: { 
        label: 'Redirect URL', 
        type: 'text',
        placeholder: 'Optional redirect URL with token parameter'
      },
    },

    async authorize(credentials) {
      // Extract token from credentials or redirect URL
      let token = credentials?.token

      // If no direct token, try to extract from redirect URL
      if (!token && credentials?.redirectUrl) {
        token = extractTokenFromUrl(credentials.redirectUrl) || undefined
      }

      if (!token) {
        throw new Error('Token is required for User Center authentication')
      }

      try {
        const config = getSDKConfig()
        
        // Call User Center API to verify token
        const response = await fetch(`${config.userCenterUrl}/auth/verify`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-App-Id': config.appId,
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            token,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(
            errorData.message || `Token verification failed: ${response.status}`
          )
        }

        const data: TokenVerifyResponse = await response.json()

        // Check if token is valid
        if (!data.valid || !data.user) {
          throw new Error(data.error || 'Invalid token')
        }

        // Return user object that will be passed to JWT callback
        return {
          id: data.user.id,
          email: data.user.email,
          name: data.user.name,
          image: data.user.profileImage,
          type: data.user.type,
          walletAddress: data.user.walletAddress,
          profileImage: data.user.profileImage,
          provider: data.user.provider || 'usercenter',
          roles: data.user.roles,
          permissions: data.user.permissions,
          createdAt: data.user.createdAt,
          access_token: token,
          refresh_token: undefined, // User Center tokens don't have refresh tokens
        }
      } catch (error) {
        console.error('User Center provider error:', error)
        
        // Re-throw with user-friendly message
        if (error instanceof Error) {
          throw error
        }
        
        throw new Error('Failed to authenticate with User Center')
      }
    },
  })
}

/**
 * Extract token from redirect URL
 * Supports both query parameter and hash fragment formats
 * 
 * @param url - The redirect URL containing the token
 * @returns The extracted token or null if not found
 * 
 * @example
 * ```typescript
 * // Query parameter format
 * extractTokenFromUrl('https://app.com/callback?token=abc123')
 * // Returns: 'abc123'
 * 
 * // Hash fragment format
 * extractTokenFromUrl('https://app.com/callback#token=abc123')
 * // Returns: 'abc123'
 * ```
 */
export function extractTokenFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url)
    
    // Try query parameter first
    const queryToken = urlObj.searchParams.get('token')
    if (queryToken && queryToken.trim()) {
      return queryToken
    }
    
    // Try hash fragment
    const hash = urlObj.hash.substring(1) // Remove leading #
    if (hash) {
      const hashParams = new URLSearchParams(hash)
      const hashToken = hashParams.get('token')
      if (hashToken && hashToken.trim()) {
        return hashToken
      }
    }
    
    return null
  } catch (error) {
    console.error('Error parsing redirect URL:', error)
    return null
  }
}
