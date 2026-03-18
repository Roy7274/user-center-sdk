import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { LoginDialog } from './LoginDialog'
import { signIn } from 'next-auth/react'
import { useWeb3Auth } from './Web3AuthProvider'
import { getSDKConfig } from '../config/sdk-config'

// Mock dependencies
vi.mock('next-auth/react', () => ({
  signIn: vi.fn(),
}))

vi.mock('./Web3AuthProvider', () => ({
  useWeb3Auth: vi.fn(),
}))

vi.mock('../config/sdk-config', () => ({
  getSDKConfig: vi.fn(),
}))

describe('LoginDialog', () => {
  const mockOnOpenChange = vi.fn()
  const mockOnSuccess = vi.fn()
  const mockOnError = vi.fn()
  const mockConnect = vi.fn()

  const defaultConfig = {
    userCenterUrl: 'https://user-center.example.com',
    appId: 'test-app-id',
    enableWeb3Auth: true,
    enableGuestLogin: true,
  }

  const defaultWeb3Auth = {
    connect: mockConnect,
    disconnect: vi.fn(),
    isConnected: false,
    userInfo: null,
    walletAddress: null,
    provider: null,
    getAccounts: vi.fn(),
    signMessage: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getSDKConfig).mockReturnValue(defaultConfig as any)
    vi.mocked(useWeb3Auth).mockReturnValue(defaultWeb3Auth)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Rendering', () => {
    it('should not render when open is false', () => {
      render(
        <LoginDialog
          open={false}
          onOpenChange={mockOnOpenChange}
        />
      )

      expect(screen.queryByText('Sign In')).not.toBeInTheDocument()
    })

    it('should render when open is true', () => {
      render(
        <LoginDialog
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      expect(screen.getByText('Sign In')).toBeInTheDocument()
    })

    it('should render all tabs when all features are enabled', () => {
      render(
        <LoginDialog
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      expect(screen.getByText('Web3Auth')).toBeInTheDocument()
      expect(screen.getByText('User Center')).toBeInTheDocument()
      expect(screen.getByText('Guest')).toBeInTheDocument()
    })

    it('should not render Web3Auth tab when disabled', () => {
      vi.mocked(getSDKConfig).mockReturnValue({
        ...defaultConfig,
        enableWeb3Auth: false,
      } as any)

      render(
        <LoginDialog
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      expect(screen.queryByText('Web3Auth')).not.toBeInTheDocument()
      expect(screen.getByText('User Center')).toBeInTheDocument()
      expect(screen.getByText('Guest')).toBeInTheDocument()
    })

    it('should not render Guest tab when disabled', () => {
      vi.mocked(getSDKConfig).mockReturnValue({
        ...defaultConfig,
        enableGuestLogin: false,
      } as any)

      render(
        <LoginDialog
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      expect(screen.getByText('Web3Auth')).toBeInTheDocument()
      expect(screen.getByText('User Center')).toBeInTheDocument()
      expect(screen.queryByText('Guest')).not.toBeInTheDocument()
    })

    it('should render default tab based on defaultTab prop', () => {
      render(
        <LoginDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          defaultTab="guest"
        />
      )

      // Guest tab should be active (has white background and shadow)
      const guestTab = screen.getByText('Guest')
      expect(guestTab.className).toContain('bg-white')
    })
  })

  describe('Close functionality', () => {
    it('should call onOpenChange with false when close button is clicked', () => {
      render(
        <LoginDialog
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      const closeButton = screen.getByLabelText('Close')
      fireEvent.click(closeButton)

      expect(mockOnOpenChange).toHaveBeenCalledWith(false)
    })
  })

  describe('Tab switching', () => {
    it('should switch to User Center tab when clicked', () => {
      render(
        <LoginDialog
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      const userCenterTab = screen.getByText('User Center')
      fireEvent.click(userCenterTab)

      expect(screen.getByText('Sign in with your User Center account. You will be redirected to the login page.')).toBeInTheDocument()
    })

    it('should switch to Guest tab when clicked', () => {
      render(
        <LoginDialog
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      const guestTab = screen.getByText('Guest')
      fireEvent.click(guestTab)

      expect(screen.getByText('Continue as a guest without creating an account. You can optionally provide a guest ID.')).toBeInTheDocument()
    })
  })

  describe('Web3Auth login', () => {
    it('should handle successful Web3Auth login', async () => {
      const mockWalletAddress = '0x1234567890123456789012345678901234567890'
      const mockUserInfo = {
        email: 'test@example.com',
        name: 'Test User',
      }

      vi.mocked(useWeb3Auth).mockReturnValue({
        ...defaultWeb3Auth,
        walletAddress: mockWalletAddress,
        userInfo: mockUserInfo,
      })

      vi.mocked(signIn).mockResolvedValue({
        ok: true,
        error: null,
        status: 200,
        url: null,
      } as any)

      render(
        <LoginDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onSuccess={mockOnSuccess}
        />
      )

      const connectButton = screen.getByText('Connect with Web3Auth')
      fireEvent.click(connectButton)

      await waitFor(() => {
        expect(mockConnect).toHaveBeenCalled()
      })

      await waitFor(() => {
        expect(signIn).toHaveBeenCalledWith('web3auth', {
          walletAddress: mockWalletAddress,
          userInfo: JSON.stringify(mockUserInfo),
          redirect: false,
        })
      })

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled()
        expect(mockOnOpenChange).toHaveBeenCalledWith(false)
      })
    })

    it('should handle Web3Auth connection failure', async () => {
      const error = new Error('Connection failed')
      mockConnect.mockRejectedValue(error)

      render(
        <LoginDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onError={mockOnError}
        />
      )

      const connectButton = screen.getByText('Connect with Web3Auth')
      fireEvent.click(connectButton)

      await waitFor(() => {
        expect(screen.getByText('Connection failed')).toBeInTheDocument()
      })

      expect(mockOnError).toHaveBeenCalledWith(error)
      expect(mockOnOpenChange).not.toHaveBeenCalled()
    })

    it('should handle missing wallet address', async () => {
      vi.mocked(useWeb3Auth).mockReturnValue({
        ...defaultWeb3Auth,
        walletAddress: null,
      })

      render(
        <LoginDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onError={mockOnError}
        />
      )

      const connectButton = screen.getByText('Connect with Web3Auth')
      fireEvent.click(connectButton)

      await waitFor(() => {
        expect(screen.getByText('Failed to get wallet address from Web3Auth')).toBeInTheDocument()
      })

      expect(mockOnError).toHaveBeenCalled()
    })

    it('should handle NextAuth signIn error', async () => {
      const mockWalletAddress = '0x1234567890123456789012345678901234567890'

      vi.mocked(useWeb3Auth).mockReturnValue({
        ...defaultWeb3Auth,
        walletAddress: mockWalletAddress,
      })

      vi.mocked(signIn).mockResolvedValue({
        ok: false,
        error: 'Authentication failed',
        status: 401,
        url: null,
      } as any)

      render(
        <LoginDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onError={mockOnError}
        />
      )

      const connectButton = screen.getByText('Connect with Web3Auth')
      fireEvent.click(connectButton)

      await waitFor(() => {
        expect(screen.getByText('Authentication failed')).toBeInTheDocument()
      })

      expect(mockOnError).toHaveBeenCalled()
    })
  })

  describe('User Center login', () => {
    it('should redirect to User Center login page', () => {
      const originalLocation = window.location
      const mockLocation = { ...originalLocation, href: '' }
      delete (window as any).location
      window.location = mockLocation as any

      render(
        <LoginDialog
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      // Switch to User Center tab
      const userCenterTab = screen.getByText('User Center')
      fireEvent.click(userCenterTab)

      const loginButton = screen.getByText('Go to User Center Login')
      fireEvent.click(loginButton)

      const expectedUrl = `${defaultConfig.userCenterUrl}/login?redirect=${encodeURIComponent(
        `${window.location.origin}/auth/callback`
      )}&app_id=${defaultConfig.appId}`

      expect(window.location.href).toBe(expectedUrl)

      window.location = originalLocation
    })
  })

  describe('Guest login', () => {
    it('should handle successful guest login with auto-generated ID', async () => {
      vi.mocked(signIn).mockResolvedValue({
        ok: true,
        error: null,
        status: 200,
        url: null,
      } as any)

      render(
        <LoginDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onSuccess={mockOnSuccess}
          defaultTab="guest"
        />
      )

      const loginButton = screen.getByText('Continue as Guest')
      fireEvent.click(loginButton)

      await waitFor(() => {
        expect(signIn).toHaveBeenCalledWith('guest', expect.objectContaining({
          guestId: expect.stringMatching(/^guest_\d+_[a-z0-9]+$/),
          redirect: false,
        }))
      })

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled()
        expect(mockOnOpenChange).toHaveBeenCalledWith(false)
      })
    })

    it('should handle successful guest login with custom ID', async () => {
      vi.mocked(signIn).mockResolvedValue({
        ok: true,
        error: null,
        status: 200,
        url: null,
      } as any)

      render(
        <LoginDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onSuccess={mockOnSuccess}
          defaultTab="guest"
        />
      )

      const input = screen.getByPlaceholderText('Guest ID (optional)')
      fireEvent.change(input, { target: { value: 'custom-guest-123' } })

      const loginButton = screen.getByText('Continue as Guest')
      fireEvent.click(loginButton)

      await waitFor(() => {
        expect(signIn).toHaveBeenCalledWith('guest', {
          guestId: 'custom-guest-123',
          redirect: false,
        })
      })

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled()
        expect(mockOnOpenChange).toHaveBeenCalledWith(false)
      })
    })

    it('should handle guest login failure', async () => {
      vi.mocked(signIn).mockResolvedValue({
        ok: false,
        error: 'Guest login failed',
        status: 401,
        url: null,
      } as any)

      render(
        <LoginDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onError={mockOnError}
          defaultTab="guest"
        />
      )

      const loginButton = screen.getByText('Continue as Guest')
      fireEvent.click(loginButton)

      await waitFor(() => {
        expect(screen.getByText('Guest login failed')).toBeInTheDocument()
      })

      expect(mockOnError).toHaveBeenCalled()
      expect(mockOnOpenChange).not.toHaveBeenCalled()
    })
  })

  describe('Loading states', () => {
    it('should show loading state during Web3Auth login', async () => {
      mockConnect.mockImplementation(() => new Promise(() => {})) // Never resolves

      render(
        <LoginDialog
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      const connectButton = screen.getByText('Connect with Web3Auth')
      fireEvent.click(connectButton)

      await waitFor(() => {
        expect(screen.getByText('Connecting...')).toBeInTheDocument()
      })

      const button = screen.getByText('Connecting...')
      expect(button).toBeDisabled()
    })

    it('should show loading state during guest login', async () => {
      vi.mocked(signIn).mockImplementation(() => new Promise(() => {})) // Never resolves

      render(
        <LoginDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          defaultTab="guest"
        />
      )

      const loginButton = screen.getByText('Continue as Guest')
      fireEvent.click(loginButton)

      await waitFor(() => {
        expect(screen.getByText('Signing in...')).toBeInTheDocument()
      })

      const button = screen.getByText('Signing in...')
      expect(button).toBeDisabled()
    })
  })
})
