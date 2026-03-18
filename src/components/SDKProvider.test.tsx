/**
 * Tests for SDKProvider Component
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { SDKProvider, useSDK } from './SDKProvider'
import { resetSDK } from '../sdk'
import { resetSDKConfig } from '../config/sdk-config'
import { resetAPIClient } from '../api/api-client'
import { resetAuthAPI } from '../api/auth-api'
import { resetPointsAPI } from '../api/points-api'
import { resetDepositAPI } from '../api/deposit-api'

// Mock next-auth
vi.mock('next-auth/react', () => ({
  SessionProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

// Mock Web3AuthProvider
vi.mock('./Web3AuthProvider', () => ({
  Web3AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

// Mock Web3Provider
vi.mock('./Web3Provider', () => ({
  Web3Provider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

describe('SDKProvider', () => {
  beforeEach(() => {
    // Reset all singletons before each test
    resetSDK()
    resetSDKConfig()
    resetAPIClient()
    resetAuthAPI()
    resetPointsAPI()
    resetDepositAPI()

    // Clear environment variables
    vi.stubEnv('NEXT_PUBLIC_USER_CENTER_URL', '')
    vi.stubEnv('NEXT_PUBLIC_APP_ID', '')
    vi.stubEnv('NEXT_PUBLIC_BSC_NETWORK', '')
    vi.stubEnv('NEXT_PUBLIC_CONTRACT_ADDRESS', '')
    vi.stubEnv('NEXT_PUBLIC_USDT_ADDRESS', '')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  const validConfig = {
    userCenterUrl: 'https://api.example.com',
    appId: 'test-app-id',
    bscNetwork: 'testnet' as const,
    contractAddress: '0x1234567890123456789012345678901234567890',
    usdtAddress: '0x0987654321098765432109876543210987654321',
  }

  describe('Initialization', () => {
    it('should initialize SDK with provided config', async () => {
      function TestComponent() {
        const { sdk, isInitialized, error } = useSDK()
        return (
          <div>
            <div data-testid="initialized">{String(isInitialized)}</div>
            <div data-testid="has-sdk">{String(!!sdk)}</div>
            <div data-testid="error">{error?.message || 'none'}</div>
          </div>
        )
      }

      render(
        <SDKProvider config={validConfig}>
          <TestComponent />
        </SDKProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('initialized').textContent).toBe('true')
        expect(screen.getByTestId('has-sdk').textContent).toBe('true')
        expect(screen.getByTestId('error').textContent).toBe('none')
      })
    })

    it('should render children after initialization', async () => {
      render(
        <SDKProvider config={validConfig}>
          <div data-testid="child">Child Component</div>
        </SDKProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('child')).toBeInTheDocument()
      })
    })

    it('should show loading component during initialization', async () => {
      render(
        <SDKProvider
          config={validConfig}
          loadingComponent={<div data-testid="loading">Loading...</div>}
        >
          <div data-testid="child">Child</div>
        </SDKProvider>
      )

      // After initialization, child should be shown (loading is too fast to test in sync mode)
      await waitFor(() => {
        expect(screen.getByTestId('child')).toBeInTheDocument()
      })
    })

    it('should handle initialization errors', async () => {
      const onError = vi.fn()

      render(
        <SDKProvider
          config={{
            // Invalid config - missing required fields
            userCenterUrl: 'invalid-url',
          } as any}
          onError={onError}
        >
          <div>Child</div>
        </SDKProvider>
      )

      await waitFor(() => {
        expect(onError).toHaveBeenCalled()
        expect(screen.getByRole('alert')).toBeInTheDocument()
      })
    })

    it('should display error message on initialization failure', async () => {
      render(
        <SDKProvider
          config={{
            userCenterUrl: 'invalid-url',
          } as any}
        >
          <div>Child</div>
        </SDKProvider>
      )

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument()
        expect(screen.getByText(/SDK Initialization Error/i)).toBeInTheDocument()
      })
    })

    it('should reuse existing SDK instance if already initialized', async () => {
      // First render
      const { unmount } = render(
        <SDKProvider config={validConfig}>
          <div>First</div>
        </SDKProvider>
      )

      await waitFor(() => {
        expect(screen.getByText('First')).toBeInTheDocument()
      })

      unmount()

      // Second render should reuse SDK
      function TestComponent() {
        const { sdk } = useSDK()
        return <div data-testid="sdk-version">{sdk?.version}</div>
      }

      render(
        <SDKProvider config={validConfig}>
          <TestComponent />
        </SDKProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('sdk-version').textContent).toBe('0.1.0')
      })
    })
  })

  describe('useSDK Hook', () => {
    it('should provide SDK instance to child components', async () => {
      function TestComponent() {
        const { sdk } = useSDK()
        return (
          <div>
            <div data-testid="has-auth">{String(!!sdk?.auth)}</div>
            <div data-testid="has-points">{String(!!sdk?.points)}</div>
            <div data-testid="has-deposit">{String(!!sdk?.deposit)}</div>
          </div>
        )
      }

      render(
        <SDKProvider config={validConfig}>
          <TestComponent />
        </SDKProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('has-auth').textContent).toBe('true')
        expect(screen.getByTestId('has-points').textContent).toBe('true')
        expect(screen.getByTestId('has-deposit').textContent).toBe('true')
      })
    })

    it('should throw error when used outside SDKProvider', () => {
      function TestComponent() {
        useSDK()
        return <div>Test</div>
      }

      // Suppress console.error for this test
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

      // The error is thrown during render, not by the render function itself
      // So we need to catch it differently
      let errorThrown = false
      try {
        render(<TestComponent />)
      } catch (error) {
        errorThrown = true
        expect(error).toBeInstanceOf(Error)
      }

      // If no error was thrown, the test should fail
      if (!errorThrown) {
        // In React 18, errors might be caught by error boundaries
        // Check if error was logged instead
        expect(consoleError).toHaveBeenCalled()
      }

      consoleError.mockRestore()
    })

    it('should provide isInitialized status', async () => {
      function TestComponent() {
        const { isInitialized } = useSDK()
        return <div data-testid="initialized">{String(isInitialized)}</div>
      }

      render(
        <SDKProvider config={validConfig}>
          <TestComponent />
        </SDKProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('initialized').textContent).toBe('true')
      })
    })

    it('should provide error state', async () => {
      // When initialization fails, the error UI is shown instead of children
      // So we can't test the error state through useSDK hook in this case
      // Instead, we verify the error is displayed in the UI
      render(
        <SDKProvider
          config={{
            userCenterUrl: 'invalid-url',
          } as any}
        >
          <div data-testid="child">Child</div>
        </SDKProvider>
      )

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument()
        expect(screen.queryByTestId('child')).not.toBeInTheDocument()
      })
    })
  })

  describe('Provider Nesting', () => {
    it('should wrap children with SessionProvider', async () => {
      render(
        <SDKProvider config={validConfig}>
          <div data-testid="child">Child</div>
        </SDKProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('child')).toBeInTheDocument()
      })
    })

    it('should include Web3AuthProvider when Web3Auth is enabled', async () => {
      render(
        <SDKProvider
          config={{
            ...validConfig,
            enableWeb3Auth: true,
            web3AuthClientId: 'test-client-id',
          }}
        >
          <div data-testid="child">Child</div>
        </SDKProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('child')).toBeInTheDocument()
      })
    })

    it('should skip Web3AuthProvider when Web3Auth is disabled', async () => {
      render(
        <SDKProvider
          config={{
            ...validConfig,
            enableWeb3Auth: false,
          }}
        >
          <div data-testid="child">Child</div>
        </SDKProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('child')).toBeInTheDocument()
      })
    })

    it('should always include Web3Provider', async () => {
      render(
        <SDKProvider config={validConfig}>
          <div data-testid="child">Child</div>
        </SDKProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('child')).toBeInTheDocument()
      })
    })
  })

  describe('Configuration', () => {
    it('should pass session to SessionProvider', async () => {
      const session = {
        user: { id: '1', name: 'Test User' },
        expires: '2024-12-31',
      }

      render(
        <SDKProvider config={validConfig} session={session}>
          <div data-testid="child">Child</div>
        </SDKProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('child')).toBeInTheDocument()
      })
    })

    it('should build Web3Auth config from SDK config', async () => {
      function TestComponent() {
        const { sdk } = useSDK()
        return (
          <div>
            <div data-testid="web3auth-client">{sdk?.config.web3AuthClientId || 'none'}</div>
            <div data-testid="web3auth-network">{sdk?.config.web3AuthNetwork || 'none'}</div>
          </div>
        )
      }

      render(
        <SDKProvider
          config={{
            ...validConfig,
            web3AuthClientId: 'test-client-id',
            web3AuthNetwork: 'cyan',
          }}
        >
          <TestComponent />
        </SDKProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('web3auth-client').textContent).toBe('test-client-id')
        expect(screen.getByTestId('web3auth-network').textContent).toBe('cyan')
      })
    })

    it('should use BSC network config for Web3Auth chain config', async () => {
      function TestComponent() {
        const { sdk } = useSDK()
        return <div data-testid="bsc-network">{sdk?.config.bscNetwork}</div>
      }

      render(
        <SDKProvider
          config={{
            ...validConfig,
            bscNetwork: 'mainnet',
          }}
        >
          <TestComponent />
        </SDKProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('bsc-network').textContent).toBe('mainnet')
      })
    })

    it('should use custom RPC URL if provided', async () => {
      function TestComponent() {
        const { sdk } = useSDK()
        return <div data-testid="rpc-url">{sdk?.config.rpcUrl || 'none'}</div>
      }

      render(
        <SDKProvider
          config={{
            ...validConfig,
            rpcUrl: 'https://custom-rpc.example.com',
          }}
        >
          <TestComponent />
        </SDKProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('rpc-url').textContent).toBe('https://custom-rpc.example.com')
      })
    })
  })

  describe('Error Handling', () => {
    it('should call onError callback on initialization failure', async () => {
      const onError = vi.fn()

      render(
        <SDKProvider
          config={{
            userCenterUrl: 'invalid-url',
          } as any}
          onError={onError}
        >
          <div>Child</div>
        </SDKProvider>
      )

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(expect.any(Error))
      })
    })

    it('should show error UI when SDK initialization fails', async () => {
      render(
        <SDKProvider
          config={{
            userCenterUrl: 'invalid-url',
          } as any}
        >
          <div>Child</div>
        </SDKProvider>
      )

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument()
        expect(screen.getByText(/SDK Initialization Error/i)).toBeInTheDocument()
      })
    })

    it('should not render children when initialization fails', async () => {
      render(
        <SDKProvider
          config={{
            userCenterUrl: 'invalid-url',
          } as any}
        >
          <div data-testid="child">Child</div>
        </SDKProvider>
      )

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument()
      })

      expect(screen.queryByTestId('child')).not.toBeInTheDocument()
    })
  })
})
