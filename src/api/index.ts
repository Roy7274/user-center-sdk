/**
 * API module exports
 * @module api
 */

export {
  APIClient,
  APIClientError,
  createAPIClient,
  getAPIClient,
  resetAPIClient,
  setTokenRefreshCallback,
  setAccessTokenGetter,
} from './api-client'

export {
  AuthAPI,
  createAuthAPI,
  getAuthAPI,
  resetAuthAPI,
  type Web3LoginRequest,
  type GuestLoginRequest,
  type VerifyTokenRequest,
  type RefreshTokenRequest,
} from './auth-api'

export {
  PointsAPI,
  createPointsAPI,
  getPointsAPI,
  resetPointsAPI,
  type PointsLedgerQuery,
} from './points-api'

export {
  DepositAPI,
  createDepositAPI,
  getDepositAPI,
  resetDepositAPI,
  type SaveDepositRecordRequest,
  type SavePaymentRecordOnlyRequest,
  type VerifyDepositResponse,
} from './deposit-api'
