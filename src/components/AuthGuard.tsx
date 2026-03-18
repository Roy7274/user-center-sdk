'use client'

import { useEffect, ReactNode } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'

/**
 * AuthGuard props interface
 */
export interface AuthGuardProps {
  children: ReactNode
  fallback?: ReactNode
  requireAuth?: boolean
  requiredRoles?: string[]
  requiredPermissions?: string[]
  redirectTo?: string
  onUnauthorized?: (reason: 'unauthenticated' | 'missing-role' | 'missing-permission') => void
}

/**
 * AuthGuard component
 * Protects routes and content by checking authentication status and permissions
 */
export function AuthGuard({
  children,
  fallback,
  requireAuth = true,
  requiredRoles = [],
  requiredPermissions = [],
  redirectTo = '/login',
  onUnauthorized,
}: AuthGuardProps) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()

  const isLoading = status === 'loading'
  const isAuthenticated = status === 'authenticated' && !!session

  // Check if user has required roles
  const hasRequiredRoles = (): boolean => {
    if (requiredRoles.length === 0) return true
    if (!session?.user?.roles) return false

    return requiredRoles.some((role) => session.user.roles.includes(role))
  }

  // Check if user has required permissions
  const hasRequiredPermissions = (): boolean => {
    if (requiredPermissions.length === 0) return true
    if (!session?.user?.permissions) return false

    return requiredPermissions.every((permission) =>
      session.user.permissions.includes(permission)
    )
  }

  useEffect(() => {
    // Don't do anything while loading
    if (isLoading) return

    // If authentication is not required, allow access
    if (!requireAuth) return

    // Check authentication
    if (!isAuthenticated) {
      onUnauthorized?.('unauthenticated')
      
      // Redirect to login with return URL
      const returnUrl = encodeURIComponent(pathname || '/')
      router.push(`${redirectTo}?returnUrl=${returnUrl}`)
      return
    }

    // Check roles
    if (requiredRoles.length > 0 && !hasRequiredRoles()) {
      onUnauthorized?.('missing-role')
      return
    }

    // Check permissions
    if (requiredPermissions.length > 0 && !hasRequiredPermissions()) {
      onUnauthorized?.('missing-permission')
      return
    }
  }, [
    isLoading,
    isAuthenticated,
    requireAuth,
    requiredRoles,
    requiredPermissions,
    pathname,
    redirectTo,
    router,
    onUnauthorized,
  ])

  // Show loading state
  if (isLoading) {
    if (fallback) {
      return <>{fallback}</>
    }

    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  // If authentication is not required, render children
  if (!requireAuth) {
    return <>{children}</>
  }

  // Check authentication
  if (!isAuthenticated) {
    return null
  }

  // Check roles
  if (requiredRoles.length > 0 && !hasRequiredRoles()) {
    if (fallback) {
      return <>{fallback}</>
    }

    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <div className="text-red-500">
          Access denied: Required role not found
        </div>
      </div>
    )
  }

  // Check permissions
  if (requiredPermissions.length > 0 && !hasRequiredPermissions()) {
    if (fallback) {
      return <>{fallback}</>
    }

    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <div className="text-red-500">
          Access denied: Required permission not found
        </div>
      </div>
    )
  }

  // All checks passed, render children
  return <>{children}</>
}
