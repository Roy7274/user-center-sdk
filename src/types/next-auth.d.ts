/**
 * NextAuth type extensions
 * Extends NextAuth's default types to include our custom user fields
 */

import 'next-auth'
import 'next-auth/jwt'
import type { UserInfo } from './auth'

declare module 'next-auth' {
  /**
   * Extend the default Session interface
   */
  interface Session {
    user: UserInfo
    access_token: string
    expires: string
  }

  /**
   * Extend the default User interface
   */
  interface User extends UserInfo {
    access_token?: string
    refresh_token?: string
  }
}

declare module 'next-auth/jwt' {
  /**
   * Extend the default JWT interface
   */
  interface JWT {
    access_token?: string
    refresh_token?: string
    user?: UserInfo
    expiresAt?: number
    error?: string
  }
}
