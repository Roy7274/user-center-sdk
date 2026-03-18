/**
 * Error Notification Component
 * 
 * Provides a toast/notification system for displaying user-friendly error messages.
 * Supports different severity levels and automatic dismissal.
 * 
 * @module components/ErrorNotification
 */

'use client'

import React, { createContext, useContext, useState, useCallback } from 'react'
import { getErrorMessage, type ErrorMessage } from '../utils/error-messages'
import type { SDKError } from '../utils/error-handling'

/**
 * Notification item
 */
export interface Notification {
  id: string
  error: Error | SDKError
  errorMessage: ErrorMessage
  timestamp: number
  dismissed?: boolean
}

/**
 * Notification context
 */
interface NotificationContextValue {
  notifications: Notification[]
  showError: (error: Error | SDKError) => void
  dismissNotification: (id: string) => void
  clearAll: () => void
}

const NotificationContext = createContext<NotificationContextValue | null>(null)

/**
 * Notification provider props
 */
export interface NotificationProviderProps {
  children: React.ReactNode
  /** Maximum number of notifications to show */
  maxNotifications?: number
  /** Auto-dismiss timeout in milliseconds (0 to disable) */
  autoDismissTimeout?: number
  /** Position of notifications */
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center'
}

/**
 * Notification provider component
 */
export function NotificationProvider({
  children,
  maxNotifications = 5,
  autoDismissTimeout = 5000,
  position = 'top-right'
}: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])

  const showError = useCallback((error: Error | SDKError) => {
    const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const errorMessage = getErrorMessage(error)
    
    const notification: Notification = {
      id,
      error,
      errorMessage,
      timestamp: Date.now()
    }

    setNotifications(prev => {
      const newNotifications = [notification, ...prev]
      
      // Limit number of notifications
      if (newNotifications.length > maxNotifications) {
        return newNotifications.slice(0, maxNotifications)
      }
      
      return newNotifications
    })

    // Auto-dismiss if timeout is set
    if (autoDismissTimeout > 0) {
      setTimeout(() => {
        dismissNotification(id)
      }, autoDismissTimeout)
    }
  }, [maxNotifications, autoDismissTimeout])

  const dismissNotification = useCallback((id: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, dismissed: true }
          : notification
      )
    )

    // Remove dismissed notification after animation
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id))
    }, 300)
  }, [])

  const clearAll = useCallback(() => {
    setNotifications([])
  }, [])

  const contextValue: NotificationContextValue = {
    notifications,
    showError,
    dismissNotification,
    clearAll
  }

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
      <NotificationContainer position={position} />
    </NotificationContext.Provider>
  )
}

/**
 * Hook to use notifications
 */
export function useNotifications(): NotificationContextValue {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}

/**
 * Hook to show error notifications
 */
export function useErrorHandler() {
  const { showError } = useNotifications()
  
  return useCallback((error: Error | SDKError) => {
    console.error('SDK Error:', error)
    showError(error)
  }, [showError])
}

/**
 * Notification container component
 */
interface NotificationContainerProps {
  position: NotificationProviderProps['position']
}

function NotificationContainer({ position }: NotificationContainerProps) {
  const { notifications, dismissNotification } = useNotifications()

  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-center': 'top-4 left-1/2 transform -translate-x-1/2',
    'bottom-center': 'bottom-4 left-1/2 transform -translate-x-1/2'
  }

  if (notifications.length === 0) {
    return null
  }

  return (
    <div 
      className={`fixed z-50 flex flex-col gap-2 ${positionClasses[position!]} max-w-sm w-full`}
      role="alert"
      aria-live="polite"
    >
      {notifications.map(notification => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onDismiss={dismissNotification}
        />
      ))}
    </div>
  )
}

/**
 * Individual notification item
 */
interface NotificationItemProps {
  notification: Notification
  onDismiss: (id: string) => void
}

function NotificationItem({ notification, onDismiss }: NotificationItemProps) {
  const { errorMessage, dismissed } = notification

  const severityStyles = {
    error: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800'
  }

  const iconStyles = {
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  }

  return (
    <div
      className={`
        border rounded-lg p-4 shadow-lg transition-all duration-300 ease-in-out
        ${dismissed ? 'opacity-0 transform translate-x-full' : 'opacity-100 transform translate-x-0'}
        ${severityStyles[errorMessage.severity]}
      `}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <span className="text-lg" role="img" aria-label={errorMessage.severity}>
            {iconStyles[errorMessage.severity]}
          </span>
          <div className="flex-1">
            <h4 className="font-semibold text-sm mb-1">
              {errorMessage.title}
            </h4>
            <p className="text-sm opacity-90">
              {errorMessage.message}
            </p>
            {errorMessage.action && (
              <button
                className="mt-2 text-sm font-medium underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-current rounded"
                onClick={() => {
                  // This could be enhanced to trigger specific actions
                  console.log(`Action requested: ${errorMessage.action}`)
                }}
              >
                {errorMessage.action}
              </button>
            )}
          </div>
        </div>
        <button
          onClick={() => onDismiss(notification.id)}
          className="ml-2 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 rounded"
          aria-label="Dismiss notification"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>
    </div>
  )
}

/**
 * Simple error boundary component
 */
interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<{ error: Error; resetError: () => void }>
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
  }

  resetError = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback
        return <FallbackComponent error={this.state.error} resetError={this.resetError} />
      }

      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <h3 className="text-red-800 font-semibold mb-2">Something went wrong</h3>
          <p className="text-red-700 text-sm mb-3">
            An unexpected error occurred. Please try refreshing the page.
          </p>
          <button
            onClick={this.resetError}
            className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            Try Again
          </button>
        </div>
      )
    }

    return this.props.children
  }
}