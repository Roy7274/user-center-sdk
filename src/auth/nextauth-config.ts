/**
 * NextAuth Configuration Module
 * 
 * This module provides the NextAuth configuration for the User Center SDK.
 * It implements JWT-based session management with automatic token refresh.
 * 
 * @example
 * ```typescript
 * // In your Next.js app's API route: app/api/auth/[...nextauth]/route.ts
 * import NextAuth from 'next-auth'
 * import { initSDKConfig } from '@ai-agent/user-center-sdk/config'
 * import { getAuthOptions } from '@ai-agent/user-center-sdk/auth'
 * 
 * // Initialize SDK configuration
 * initSDKConfig({
 *   userCenterUrl: process.env.NEXT_PUBLIC_USER_CENTER_URL!,
 *   appId: process.env.NEXT_PUBLIC_APP_ID!,
 *   bscNetwork: 'testnet',
 *   contractAddress: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS!,
 *   usdtAddress: process.env.NEXT_PUBLIC_USDT_ADDRESS!,
 *   nextAuthSecret: process.env.NEXTAUTH_SECRET,
 * })
 * 
 * // Get auth options and create handler
 * const authOptions = getAuthOptions()
 * const handler = NextAuth(authOptions)
 * 
 * export { handler as GET, handler as POST }
 * ```
 * 
 * @module auth/nextauth-config
 */

import type { NextAuthOptions } from 'next-auth'
import type { JWT } from 'next-auth/jwt'
import { getSDKConfig } from '../config/sdk-config'
import type { Session } from '../types/auth'
import { createWeb3AuthProvider } from './providers/web3auth-provider'
import { createUserCenterProvider } from './providers/user-center-provider'
import { createGuestProvider } from './providers/guest-provider'

/**
 * NextAuth configuration options for the SDK
 * Implements JWT strategy with session callbacks for token refresh
 */
export function createAuthOptions(): NextAuthOptions {
  const config = getSDKConfig()

  const authOptions: NextAuthOptions = {
    // Use JWT strategy for session management
    session: {
      strategy: 'jwt',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    },

    // Authentication providers
    providers: [
      // Web3Auth provider for social and wallet login (Task 2.2)
      ...(config.enableWeb3Auth !== false ? [createWeb3AuthProvider()] : []),
      // User Center provider for token-based login (Task 2.3)
      createUserCenterProvider(),
      // Guest provider for guest login (Task 2.4)
      ...(config.enableGuestLogin !== false ? [createGuestProvider()] : []),
    ],

    // Custom pages configuration
    pages: {
      signIn: '/auth/signin',
      error: '/auth/error',
    },

    // Callbacks for JWT and session management
    callbacks: {
      /**
       * JWT callback - called whenever a JWT is created or updated
       * Handles token refresh and user data persistence
       */
      async jwt({ token, user, account }): Promise<JWT> {
        // Initial sign in - store user data and access token in JWT
        if (user && account) {
          return {
            ...token,
            access_token: (user as any).access_token || account.access_token,
            refresh_token: (user as any).refresh_token || account.refresh_token,
            user: {
              id: user.id || (user as any).userId,
              email: user.email || undefined,
              name: user.name || undefined,
              type: (user as any).type || 'regular',
              walletAddress: (user as any).walletAddress,
              profileImage: user.image || (user as any).profileImage,
              provider: account.provider,
              roles: (user as any).roles || [],
              permissions: (user as any).permissions || [],
              createdAt: (user as any).createdAt || new Date().toISOString(),
            },
            expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days from now
          }
        }

        // Token refresh logic - check if token needs refresh
        const expiresAt = (token.expiresAt as number) || 0
        const shouldRefresh = Date.now() > expiresAt - 5 * 60 * 1000 // Refresh 5 minutes before expiry

        if (shouldRefresh && token.refresh_token) {
          try {
            // Attempt to refresh the token
            const refreshedToken = await refreshAccessToken(token)
            return refreshedToken
          } catch (error) {
            console.error('Error refreshing access token:', error)
            // Return existing token if refresh fails
            return {
              ...token,
              error: 'RefreshAccessTokenError',
            }
          }
        }

        // Return existing token if no refresh needed
        return token
      },

      /**
       * Session callback - called whenever session is checked
       * Shapes the session object returned to the client
       */
      async session({ session, token }): Promise<Session> {
        // Map JWT token data to session structure
        return {
          ...session,
          user: token.user as Session['user'],
          access_token: token.access_token as string,
          expires: session.expires,
        }
      },
    },

    // Enable debug mode in development
    debug: process.env.NODE_ENV === 'development',

    // Secret for JWT signing
    secret: config.nextAuthSecret || process.env.NEXTAUTH_SECRET,
  }

  return authOptions
}

/**
 * Refresh access token using refresh token
 * This function will be implemented when the User Center API client is ready
 */
async function refreshAccessToken(token: JWT): Promise<JWT> {
  try {
    const config = getSDKConfig()
    
    // Call User Center API to refresh token
    const response = await fetch(`${config.userCenterUrl}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        refresh_token: token.refresh_token,
        app_id: config.appId,
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to refresh token')
    }

    const data = await response.json()

    return {
      ...token,
      access_token: data.access_token,
      refresh_token: data.refresh_token || token.refresh_token,
      expiresAt: Date.now() + (data.expiresIn || 30 * 24 * 60 * 60) * 1000,
    }
  } catch (error) {
    console.error('Error in refreshAccessToken:', error)
    return {
      ...token,
      error: 'RefreshAccessTokenError',
    }
  }
}

/**
 * Get the NextAuth configuration options
 * This is a lazy-evaluated export that will be used in the Next.js API route
 * Note: SDK must be initialized before accessing this
 */
export function getAuthOptions(): NextAuthOptions {
  return createAuthOptions()
}
