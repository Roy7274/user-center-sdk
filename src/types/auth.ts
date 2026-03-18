/**
 * User type enumeration
 */
export type UserType = 'guest' | 'regular' | 'web3' | 'social'

/**
 * User information interface
 */
export interface UserInfo {
  id: string
  email?: string
  name?: string
  type: UserType
  walletAddress?: string
  profileImage?: string
  provider?: string
  roles: string[]
  permissions: string[]
  createdAt: string
}

/**
 * Session interface (extends NextAuth Session)
 */
export interface Session {
  user: UserInfo
  access_token: string
  expires: string
}

/**
 * Web3Auth user information
 */
export interface Web3AuthUserInfo {
  email?: string
  name?: string
  profileImage?: string
  aggregateVerifier?: string
  verifier?: string
  verifierId?: string
  typeOfLogin?: string
}

/**
 * Authentication credentials for different login methods
 */
export interface Web3AuthCredentials {
  type: 'web3auth'
  walletAddress: string
  userInfo?: Web3AuthUserInfo
}

export interface UserCenterCredentials {
  type: 'usercenter'
  token: string
  redirectUrl?: string
}

export interface GuestCredentials {
  type: 'guest'
  guestId?: string
}

export type AuthCredentials =
  | Web3AuthCredentials
  | UserCenterCredentials
  | GuestCredentials

/**
 * Authentication API responses
 */
export interface AuthResponse {
  access_token: string
  refresh_token?: string
  user: UserInfo
  expiresIn?: number
}

export interface TokenVerifyResponse {
  valid: boolean
  user?: UserInfo
  error?: string
}

export interface RefreshTokenResponse {
  access_token: string
  refresh_token?: string
  expiresIn?: number
}
