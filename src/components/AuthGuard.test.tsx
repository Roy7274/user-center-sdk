import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { AuthGuard } from './AuthGuard'
import { useSession } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'

// Mock dependencies
vi.mock('next-auth/react', () => ({
  useSession: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  usePathname: vi.fn(),
}))

describe('AuthGuard', () => {
  const mockPush = vi.fn()
  const mockRouter = { push: mockPush }
  const mockPathname = '/protected'

  const mockSession = {
    user: {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      type: 'regular' as const,
      roles: ['user', 'admin'],
      permissions: ['read', 'write', 'delete'],
      createdAt: '2024-01-01T00:00:00Z',
    },
    access_token: 'mock-token',
    expires: '2024-12-31T23:59:59Z',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useRouter).mockReturnValue(mockRouter as any)
    vi.mocked(usePathname).mockReturnValue(mockPathname)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Loading state', () => {
    it('should show default loading state when session is loading', () => {
      vi.mocked(useSession).mockReturnValue({
        data: null,
        status: 'loading',
        update: vi.fn(),
      } as any)

      render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      )

      expect(screen.getByText('Loading...')).toBeInTheDocument()
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
    })

    it('should show custom fallback when session is loading', () => {
      vi.mocked(useSession).mockReturnValue({
        data: null,
        status: 'loading',
        update: vi.fn(),
      } as any)

      render(
        <AuthGuard fallback={<div>Custom Loading...</div>}>
          <div>Protected Content</div>
        </AuthGuard>
      )

      expect(screen.getByText('Custom Loading...')).toBeInTheDocument()
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
    })
  })

  describe('Authentication checks', () => {
    it('should render children when authenticated', () => {
      vi.mocked(useSession).mockReturnValue({
        data: mockSession,
        status: 'authenticated',
        update: vi.fn(),
      } as any)

      render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      )

      expect(screen.getByText('Protected Content')).toBeInTheDocument()
    })

    it('should redirect to login when not authenticated', async () => {
      vi.mocked(useSession).mockReturnValue({
        data: null,
        status: 'unauthenticated',
        update: vi.fn(),
      } as any)

      render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      )

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith(
          `/login?returnUrl=${encodeURIComponent(mockPathname)}`
        )
      })

      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
    })

    it('should redirect to custom path when not authenticated', async () => {
      vi.mocked(useSession).mockReturnValue({
        data: null,
        status: 'unauthenticated',
        update: vi.fn(),
      } as any)

      render(
        <AuthGuard redirectTo="/auth/signin">
          <div>Protected Content</div>
        </AuthGuard>
      )

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith(
          `/auth/signin?returnUrl=${encodeURIComponent(mockPathname)}`
        )
      })
    })

    it('should call onUnauthorized callback when not authenticated', async () => {
      const mockOnUnauthorized = vi.fn()

      vi.mocked(useSession).mockReturnValue({
        data: null,
        status: 'unauthenticated',
        update: vi.fn(),
      } as any)

      render(
        <AuthGuard onUnauthorized={mockOnUnauthorized}>
          <div>Protected Content</div>
        </AuthGuard>
      )

      await waitFor(() => {
        expect(mockOnUnauthorized).toHaveBeenCalledWith('unauthenticated')
      })
    })

    it('should render children when requireAuth is false', () => {
      vi.mocked(useSession).mockReturnValue({
        data: null,
        status: 'unauthenticated',
        update: vi.fn(),
      } as any)

      render(
        <AuthGuard requireAuth={false}>
          <div>Public Content</div>
        </AuthGuard>
      )

      expect(screen.getByText('Public Content')).toBeInTheDocument()
      expect(mockPush).not.toHaveBeenCalled()
    })
  })

  describe('Role checks', () => {
    it('should render children when user has required role', () => {
      vi.mocked(useSession).mockReturnValue({
        data: mockSession,
        status: 'authenticated',
        update: vi.fn(),
      } as any)

      render(
        <AuthGuard requiredRoles={['admin']}>
          <div>Admin Content</div>
        </AuthGuard>
      )

      expect(screen.getByText('Admin Content')).toBeInTheDocument()
    })

    it('should render children when user has any of the required roles', () => {
      vi.mocked(useSession).mockReturnValue({
        data: mockSession,
        status: 'authenticated',
        update: vi.fn(),
      } as any)

      render(
        <AuthGuard requiredRoles={['superadmin', 'admin']}>
          <div>Admin Content</div>
        </AuthGuard>
      )

      expect(screen.getByText('Admin Content')).toBeInTheDocument()
    })

    it('should show error when user does not have required role', () => {
      vi.mocked(useSession).mockReturnValue({
        data: mockSession,
        status: 'authenticated',
        update: vi.fn(),
      } as any)

      render(
        <AuthGuard requiredRoles={['superadmin']}>
          <div>Admin Content</div>
        </AuthGuard>
      )

      expect(screen.getByText('Access denied: Required role not found')).toBeInTheDocument()
      expect(screen.queryByText('Admin Content')).not.toBeInTheDocument()
    })

    it('should show custom fallback when user does not have required role', () => {
      vi.mocked(useSession).mockReturnValue({
        data: mockSession,
        status: 'authenticated',
        update: vi.fn(),
      } as any)

      render(
        <AuthGuard
          requiredRoles={['superadmin']}
          fallback={<div>Custom Access Denied</div>}
        >
          <div>Admin Content</div>
        </AuthGuard>
      )

      expect(screen.getByText('Custom Access Denied')).toBeInTheDocument()
      expect(screen.queryByText('Admin Content')).not.toBeInTheDocument()
    })

    it('should call onUnauthorized callback when user does not have required role', async () => {
      const mockOnUnauthorized = vi.fn()

      vi.mocked(useSession).mockReturnValue({
        data: mockSession,
        status: 'authenticated',
        update: vi.fn(),
      } as any)

      render(
        <AuthGuard
          requiredRoles={['superadmin']}
          onUnauthorized={mockOnUnauthorized}
        >
          <div>Admin Content</div>
        </AuthGuard>
      )

      await waitFor(() => {
        expect(mockOnUnauthorized).toHaveBeenCalledWith('missing-role')
      })
    })

    it('should handle missing roles array in session', () => {
      const sessionWithoutRoles = {
        ...mockSession,
        user: {
          ...mockSession.user,
          roles: undefined as any,
        },
      }

      vi.mocked(useSession).mockReturnValue({
        data: sessionWithoutRoles,
        status: 'authenticated',
        update: vi.fn(),
      } as any)

      render(
        <AuthGuard requiredRoles={['admin']}>
          <div>Admin Content</div>
        </AuthGuard>
      )

      expect(screen.getByText('Access denied: Required role not found')).toBeInTheDocument()
    })
  })

  describe('Permission checks', () => {
    it('should render children when user has all required permissions', () => {
      vi.mocked(useSession).mockReturnValue({
        data: mockSession,
        status: 'authenticated',
        update: vi.fn(),
      } as any)

      render(
        <AuthGuard requiredPermissions={['read', 'write']}>
          <div>Protected Content</div>
        </AuthGuard>
      )

      expect(screen.getByText('Protected Content')).toBeInTheDocument()
    })

    it('should show error when user does not have all required permissions', () => {
      vi.mocked(useSession).mockReturnValue({
        data: mockSession,
        status: 'authenticated',
        update: vi.fn(),
      } as any)

      render(
        <AuthGuard requiredPermissions={['read', 'write', 'admin']}>
          <div>Protected Content</div>
        </AuthGuard>
      )

      expect(screen.getByText('Access denied: Required permission not found')).toBeInTheDocument()
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
    })

    it('should show custom fallback when user does not have required permissions', () => {
      vi.mocked(useSession).mockReturnValue({
        data: mockSession,
        status: 'authenticated',
        update: vi.fn(),
      } as any)

      render(
        <AuthGuard
          requiredPermissions={['admin']}
          fallback={<div>Custom Permission Denied</div>}
        >
          <div>Protected Content</div>
        </AuthGuard>
      )

      expect(screen.getByText('Custom Permission Denied')).toBeInTheDocument()
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
    })

    it('should call onUnauthorized callback when user does not have required permissions', async () => {
      const mockOnUnauthorized = vi.fn()

      vi.mocked(useSession).mockReturnValue({
        data: mockSession,
        status: 'authenticated',
        update: vi.fn(),
      } as any)

      render(
        <AuthGuard
          requiredPermissions={['admin']}
          onUnauthorized={mockOnUnauthorized}
        >
          <div>Protected Content</div>
        </AuthGuard>
      )

      await waitFor(() => {
        expect(mockOnUnauthorized).toHaveBeenCalledWith('missing-permission')
      })
    })

    it('should handle missing permissions array in session', () => {
      const sessionWithoutPermissions = {
        ...mockSession,
        user: {
          ...mockSession.user,
          permissions: undefined as any,
        },
      }

      vi.mocked(useSession).mockReturnValue({
        data: sessionWithoutPermissions,
        status: 'authenticated',
        update: vi.fn(),
      } as any)

      render(
        <AuthGuard requiredPermissions={['read']}>
          <div>Protected Content</div>
        </AuthGuard>
      )

      expect(screen.getByText('Access denied: Required permission not found')).toBeInTheDocument()
    })
  })

  describe('Combined checks', () => {
    it('should render children when user has both required roles and permissions', () => {
      vi.mocked(useSession).mockReturnValue({
        data: mockSession,
        status: 'authenticated',
        update: vi.fn(),
      } as any)

      render(
        <AuthGuard
          requiredRoles={['admin']}
          requiredPermissions={['read', 'write']}
        >
          <div>Protected Content</div>
        </AuthGuard>
      )

      expect(screen.getByText('Protected Content')).toBeInTheDocument()
    })

    it('should show error when user has role but not permissions', () => {
      vi.mocked(useSession).mockReturnValue({
        data: mockSession,
        status: 'authenticated',
        update: vi.fn(),
      } as any)

      render(
        <AuthGuard
          requiredRoles={['admin']}
          requiredPermissions={['superadmin']}
        >
          <div>Protected Content</div>
        </AuthGuard>
      )

      expect(screen.getByText('Access denied: Required permission not found')).toBeInTheDocument()
    })

    it('should show error when user has permissions but not role', () => {
      vi.mocked(useSession).mockReturnValue({
        data: mockSession,
        status: 'authenticated',
        update: vi.fn(),
      } as any)

      render(
        <AuthGuard
          requiredRoles={['superadmin']}
          requiredPermissions={['read']}
        >
          <div>Protected Content</div>
        </AuthGuard>
      )

      expect(screen.getByText('Access denied: Required role not found')).toBeInTheDocument()
    })
  })

  describe('Edge cases', () => {
    it('should handle empty roles and permissions arrays', () => {
      vi.mocked(useSession).mockReturnValue({
        data: mockSession,
        status: 'authenticated',
        update: vi.fn(),
      } as any)

      render(
        <AuthGuard requiredRoles={[]} requiredPermissions={[]}>
          <div>Protected Content</div>
        </AuthGuard>
      )

      expect(screen.getByText('Protected Content')).toBeInTheDocument()
    })

    it('should handle session without user object', () => {
      const sessionWithoutUser = {
        access_token: 'mock-token',
        expires: '2024-12-31T23:59:59Z',
      }

      vi.mocked(useSession).mockReturnValue({
        data: sessionWithoutUser as any,
        status: 'authenticated',
        update: vi.fn(),
      } as any)

      render(
        <AuthGuard requiredRoles={['admin']}>
          <div>Protected Content</div>
        </AuthGuard>
      )

      expect(screen.getByText('Access denied: Required role not found')).toBeInTheDocument()
    })

    it('should not redirect when loading', () => {
      vi.mocked(useSession).mockReturnValue({
        data: null,
        status: 'loading',
        update: vi.fn(),
      } as any)

      render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      )

      expect(mockPush).not.toHaveBeenCalled()
    })

    it('should handle pathname being null', async () => {
      vi.mocked(usePathname).mockReturnValue(null as any)
      vi.mocked(useSession).mockReturnValue({
        data: null,
        status: 'unauthenticated',
        update: vi.fn(),
      } as any)

      render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      )

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith(
          `/login?returnUrl=${encodeURIComponent('/')}`
        )
      })
    })
  })
})
