/**
 * Guest Credentials Provider for NextAuth
 * 
 * This provider handles guest authentication, allowing users to access
 * the application without creating an account. Guest sessions are tracked
 * via a generated guest ID stored in browser storage.
 * 
 * @module auth/providers/guest-provider
 */

import CredentialsProvider from 'next-auth/providers/credentials'
import type { CredentialsConfig } from 'next-auth/providers/credentials'
import { getSDKConfig } from '../../config/sdk-config'
import type { AuthResponse } from '../../types/auth'

/**
 * Generate a unique guest ID
 * Format: guest_<timestamp>_<random>
 * 
 * @returns A unique guest identifier
 * 
 * @example
 * ```typescript
 * const guestId = generateGuestId()
 * // Returns: 'guest_1234567890_abc123'
 * ```
 */
export function generateGuestId(): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 15)
  return `guest_${timestamp}_${random}`
}

/**
 * Create Guest credentials provider for NextAuth
 * 
 * This provider authenticates guest users by:
 * 1. Generating or receiving a guest ID
 * 2. Calling User Center /auth/guestLogin API
 * 3. Returning user data and access token for session creation
 * 
 * @returns NextAuth CredentialsProvider configured for guest login
 * 
 * @example
 * ```typescript
 * import { createGuestProvider } from '@ai-agent/user-center-sdk/auth'
 * 
 * const authOptions = {
 *   providers: [
 *     createGuestProvider(),
 *     // ... other providers
 *   ]
 * }
 * ```
 */
export function createGuestProvider(): CredentialsConfig {
  return CredentialsProvider({
    id: 'guest',
    name: 'Guest',
    
    credentials: {
      guestId: { 
        label: 'Guest ID', 
        type: 'text',
        placeholder: 'Optional guest ID for returning guests' 
      },
    },

    async authorize(credentials) {
      try {
        const config = getSDKConfig()
        
        // Generate guest ID if not provided
        const guestId = credentials?.guestId || generateGuestId()

        // Call User Center API to authenticate as guest
        const response = await fetch(`${config.userCenterUrl}/auth/guestLogin`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-App-Id': config.appId,
          },
          body: JSON.stringify({
            guestId,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(
            errorData.message || `Guest login failed: ${response.status}`
          )
        }

        const data: AuthResponse = await response.json()

        // Return user object that will be passed to JWT callback
        return {
          id: data.user.id,
          email: data.user.email,
          name: data.user.name || `Guest ${guestId.substring(6, 12)}`,
          image: data.user.profileImage,
          type: data.user.type,
          walletAddress: data.user.walletAddress,
          profileImage: data.user.profileImage,
          provider: 'guest',
          roles: data.user.roles,
          permissions: data.user.permissions,
          createdAt: data.user.createdAt,
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          guestId, // Store guest ID for session management
        }
      } catch (error) {
        console.error('Guest provider error:', error)
        
        // Re-throw with user-friendly message
        if (error instanceof Error) {
          throw error
        }
        
        throw new Error('Failed to authenticate as guest')
      }
    },
  })
}
