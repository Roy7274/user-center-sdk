/**
 * Points module exports
 */

// Export Points API
export {
  PointsAPI,
  createPointsAPI,
  getPointsAPI,
  resetPointsAPI,
  type PointsLedgerQuery,
} from '../api/points-api'

// Export Points types
export type {
  PointsBalance,
  PointsLedgerEntry,
  PointsLedgerResponse,
  CheckInResult,
  MemberLevel,
  MemberLevelType,
  PointsTransactionType,
  PointsTransactionSource,
} from '../types/points'

// Export Points hooks
export { usePoints, type UsePointsReturn } from '../hooks/usePoints'
export { usePointsLedger, type UsePointsLedgerReturn } from '../hooks/usePointsLedger'
