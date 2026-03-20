// Components module exports

// SDK Provider (root provider)
export {
  SDKProvider,
  useSDK,
  type SDKProviderProps,
  type SDKContextValue,
} from './SDKProvider'

export {
  Web3AuthProvider,
  useWeb3Auth,
  type Web3AuthProviderProps,
  type Web3AuthContextValue,
  type Web3AuthConfig,
} from './Web3AuthProvider'

export {
  Web3Provider,
  useWeb3,
  type Web3ProviderProps,
  type Web3ContextValue,
  type Web3WalletState,
} from './Web3Provider'

export {
  LoginDialog,
  type LoginDialogProps,
  type LoginTab,
} from './LoginDialog'

export {
  DepositDialog,
  type DepositDialogProps,
} from './DepositDialog'

export {
  PaymentOnlyDialog,
  type PaymentOnlyDialogProps,
} from '../payments/payment-only'

export {
  PointsDisplay,
  type PointsDisplayProps,
} from './PointsDisplay'

export {
  PointsDetailsDialog,
  type PointsDetailsDialogProps,
} from './PointsDetailsDialog'

export {
  AuthGuard,
  type AuthGuardProps,
} from './AuthGuard'

// Error Handling Components
export {
  NotificationProvider,
  useNotifications,
  useErrorHandler,
  ErrorBoundary,
  type NotificationProviderProps,
  type Notification,
} from './ErrorNotification'
