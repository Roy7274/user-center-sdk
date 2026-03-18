/**
 * Authentication Integration Module
 * 
 * Connects NextAuth session management with the API client for automatic
 * token injection and refresh functionality.
 * 
 * @module auth/integration
 */

import { getSession } from 'next-auth/react'
import { setAccessTokenGetter, setTokenRefreshCallback } from '../api/api-client'

/**
 * Initialize authentication integration
 * 
 * Sets up the connection between NextAuth session and API client:
 * - Configures automatic token injection for API requests
 * - Sets up token refresh callback for 401 responses
 * 
 * This should be called during SDK initialization to ensure
 * all API requests are properly authenticated.
 * 
 * @example
 * ```typescript
 * import { initAuthIntegration } from '@ai-agent/user-center-sdk/auth'
 * 
 * // Initialize during app startup
 * initAuthIntegration()
 * ```
 */
export function initAuthIntegration(): void {
  // Set up access token getter
  setAccessTokenGetter(async () => {
    try {
      const session = await getSession()
      return session?.access_token || null
    } catch (error) {
      console.warn('Failed to get session for API authentication:', error)
      return null
    }
  })

  // Set up token refresh callback
  setTokenRefreshCallback(async () => {
    try {
      // For now, we don't have a refresh token mechanism in NextAuth
      // This would need to be implemented based on your specific setup
      // For example, you might store refresh tokens in the session
      console.warn('Token refresh not implemented - would need refresh token from session')
      return null
    } catch (error) {
      console.warn('Failed to refresh token:', error)
      return null
    }
  })
}

/**
 * Reset authentication integration (mainly for testing)
 * 
 * Clears the token getter and refresh callback.
 */
export function resetAuthIntegration(): void {
  setAccessTokenGetter(async () => null)
  setTokenRefreshCallback(async () => null)
}