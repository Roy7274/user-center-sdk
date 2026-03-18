/**
 * Authentication API Client
 * 
 * Provides methods for authentication operations:
 * - Web3 login (wallet-based authentication)
 * - Guest login (anonymous authentication)
 * - Token verification
 * - Token refresh
 * - Logout
 * 
 * @module api/auth-api
 */

import { getAPIClient } from './api-client'
import type {
  AuthResponse,
  TokenVerifyResponse,
  RefreshTokenResponse,
  Web3AuthUserInfo,
} from '../types/auth'

/**
 * Web3 login request payload
 */
export interface Web3LoginRequest {
  walletAddress: string
  userInfo?: Web3AuthUserInfo
  signature?: string
}

/**
 * Guest login request payload
 */
export interface GuestLoginRequest {
  guestId?: string
  deviceId?: string
}

/**
 * Token verification request payload
 */
export interface VerifyTokenRequest {
  token: string
}

/**
 * Token refresh request payload
 */
export interface RefreshTokenRequest {
  refresh_token: string
}

/**
 * Authentication API class
 */
export class AuthAPI {
  /**
   * Web3 login - authenticate using wallet address
   * 
   * @param request - Web3 login request with wallet address and optional user info
   * @returns Authentication response with access token and user info
   * 
   * @example
   * ```typescript
   * const authApi = new AuthAPI()
   * const result = await authApi.web3Login({
   *   walletAddress: '0x1234...',
   *   userInfo: { email: 'user@example.com', name: 'John Doe' }
   * })
   * console.log(result.access_token)
   * ```
   */
  async web3Login(request: Web3LoginRequest): Promise<AuthResponse> {
    const client = getAPIClient()
    return client.post<AuthResponse>('/auth/web3Login', request)
  }

  /**
   * Guest login - authenticate as anonymous guest user
   * 
   * @param request - Guest login request with optional guest ID
   * @returns Authentication response with access token and guest user info
   * 
   * @example
   * ```typescript
   * const authApi = new AuthAPI()
   * const result = await authApi.guestLogin({
   *   guestId: 'guest-123',
   *   deviceId: 'device-456'
   * })
   * console.log(result.user.type) // 'guest'
   * ```
   */
  async guestLogin(request: GuestLoginRequest = {}): Promise<AuthResponse> {
    const client = getAPIClient()
    return client.post<AuthResponse>('/auth/guestLogin', request)
  }

  /**
   * Verify token - validate an access token and retrieve user info
   * 
   * @param request - Token verification request with token string
   * @returns Token verification response with validity status and user info
   * 
   * @example
   * ```typescript
   * const authApi = new AuthAPI()
   * const result = await authApi.verifyToken({ token: 'eyJhbGc...' })
   * if (result.valid) {
   *   console.log(result.user)
   * }
   * ```
   */
  async verifyToken(request: VerifyTokenRequest): Promise<TokenVerifyResponse> {
    const client = getAPIClient()
    return client.post<TokenVerifyResponse>('/auth/verify', request)
  }

  /**
   * Refresh token - obtain a new access token using refresh token
   * 
   * @param request - Refresh token request with refresh token string
   * @returns New access token and optional new refresh token
   * 
   * @example
   * ```typescript
   * const authApi = new AuthAPI()
   * const result = await authApi.refreshToken({ refresh_token: 'refresh-token-123' })
   * console.log(result.access_token)
   * ```
   */
  async refreshToken(request: RefreshTokenRequest): Promise<RefreshTokenResponse> {
    const client = getAPIClient()
    return client.post<RefreshTokenResponse>('/auth/refresh', request)
  }

  /**
   * Logout - invalidate current session and tokens
   * 
   * @returns Empty response on successful logout
   * 
   * @example
   * ```typescript
   * const authApi = new AuthAPI()
   * await authApi.logout()
   * console.log('Logged out successfully')
   * ```
   */
  async logout(): Promise<void> {
    const client = getAPIClient()
    await client.post<void>('/auth/logout')
  }
}

/**
 * Create a new AuthAPI instance
 */
export function createAuthAPI(): AuthAPI {
  return new AuthAPI()
}

/**
 * Default AuthAPI instance (singleton)
 */
let defaultAuthAPI: AuthAPI | null = null

/**
 * Get the default AuthAPI instance
 */
export function getAuthAPI(): AuthAPI {
  if (!defaultAuthAPI) {
    defaultAuthAPI = createAuthAPI()
  }
  return defaultAuthAPI
}

/**
 * Reset the default AuthAPI instance (mainly for testing)
 */
export function resetAuthAPI(): void {
  defaultAuthAPI = null
}
