import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { Web3AuthProvider, useWeb3Auth } from './Web3AuthProvider'
import * as sdkConfig from '../config/sdk-config'

// Mock Web3Auth
vi.mock('@web3auth/modal', () => ({
  Web3Auth: vi.fn().mockImplementation(() => ({
    initModal: vi.fn().mockResolvedValue(undefined),
    connect: vi.fn().mockResolvedValue({
      request: vi.fn().mockResolvedValue(['0x1234567890123456789012345678901234567890']),
    }),
    logout: vi.fn().mockResolvedValue(undefined),
    getUserInfo: vi.fn().mockResolvedValue({
      email: 'test@example.com',
      name: 'Test User',
      profileImage: 'https://example.com/avatar.jpg',
    }),
    connected: false,
    provider: null,
  })),
}))

vi.mock('@web3auth/base', () => ({
  CHAIN_NAMESPACES: {
    EIP155: 'eip155',
  },
  WEB3AUTH_NETWORK: {
    MAINNET: 'mainnet',
    TESTNET: 'testnet',
    CYAN: 'cyan',
  },
}))

vi.mock('@web3auth/ethereum-provider', () => ({
  EthereumPrivateKeyProvider: vi.fn().mockImplementation(() => ({})),
}))

// Test component that uses the hook
function TestComponent() {
  const { isConnected, walletAddress, userInfo, connect, disconnect } = useWeb3Auth()

  return (
    <div>
      <div data-testid="connection-status">{isConnected ? 'connected' : 'disconnected'}</div>
      <div data-testid="wallet-address">{walletAddress || 'no-address'}</div>
      <div data-testid="user-email">{userInfo?.email || 'no-email'}</div>
      <button onClick={connect}>Connect</button>
      <button onClick={disconnect}>Disconnect</button>
    </div>
  )
}

describe('Web3AuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock SDK config
    vi.spyOn(sdkConfig, 'getSDKConfig').mockReturnValue({
      userCenterUrl: 'https://api.example.com',
      appId: 'test-app-id',
      web3AuthClientId: 'test-client-id',
      web3AuthNetwork: 'testnet',
      bscNetwork: 'testnet',
      contractAddress: '0x1234567890123456789012345678901234567890',
      usdtAddress: '0x0987654321098765432109876543210987654321',
      enableWeb3Auth: true,
      enableGuestLogin: true,
      enableDeposit: true,
      locale: 'en',
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should render children', () => {
    render(
      <Web3AuthProvider>
        <div>Test Child</div>
      </Web3AuthProvider>
    )

    expect(screen.getByText('Test Child')).toBeInTheDocument()
  })

  it('should initialize with disconnected state', async () => {
    render(
      <Web3AuthProvider>
        <TestComponent />
      </Web3AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('connection-status')).toHaveTextContent('disconnected')
      expect(screen.getByTestId('wallet-address')).toHaveTextContent('no-address')
      expect(screen.getByTestId('user-email')).toHaveTextContent('no-email')
    })
  })

  it('should throw error when useWeb3Auth is used outside provider', () => {
    // Suppress console.error for this test
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => {
      render(<TestComponent />)
    }).toThrow('useWeb3Auth must be used within a Web3AuthProvider')

    consoleError.mockRestore()
  })

  it('should not initialize when Web3Auth is disabled', async () => {
    vi.spyOn(sdkConfig, 'getSDKConfig').mockReturnValue({
      userCenterUrl: 'https://api.example.com',
      appId: 'test-app-id',
      bscNetwork: 'testnet',
      contractAddress: '0x1234567890123456789012345678901234567890',
      usdtAddress: '0x0987654321098765432109876543210987654321',
      enableWeb3Auth: false,
      enableGuestLogin: true,
      enableDeposit: true,
      locale: 'en',
    })

    const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {})

    render(
      <Web3AuthProvider>
        <TestComponent />
      </Web3AuthProvider>
    )

    await waitFor(() => {
      expect(consoleLog).toHaveBeenCalledWith('Web3Auth is disabled in SDK configuration')
    })

    consoleLog.mockRestore()
  })

  it('should handle missing client ID', async () => {
    vi.spyOn(sdkConfig, 'getSDKConfig').mockReturnValue({
      userCenterUrl: 'https://api.example.com',
      appId: 'test-app-id',
      bscNetwork: 'testnet',
      contractAddress: '0x1234567890123456789012345678901234567890',
      usdtAddress: '0x0987654321098765432109876543210987654321',
      enableWeb3Auth: true,
      enableGuestLogin: true,
      enableDeposit: true,
      locale: 'en',
    })

    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <Web3AuthProvider>
        <TestComponent />
      </Web3AuthProvider>
    )

    await waitFor(() => {
      expect(consoleError).toHaveBeenCalledWith('Web3Auth client ID is not configured')
    })

    consoleError.mockRestore()
  })

  it('should provide context value with all required methods', async () => {
    let contextValue: any

    function ContextConsumer() {
      contextValue = useWeb3Auth()
      return null
    }

    render(
      <Web3AuthProvider>
        <ContextConsumer />
      </Web3AuthProvider>
    )

    await waitFor(() => {
      expect(contextValue).toBeDefined()
      expect(contextValue.isConnected).toBe(false)
      expect(contextValue.userInfo).toBeNull()
      expect(contextValue.walletAddress).toBeNull()
      expect(contextValue.provider).toBeNull()
      expect(typeof contextValue.connect).toBe('function')
      expect(typeof contextValue.disconnect).toBe('function')
      expect(typeof contextValue.getAccounts).toBe('function')
      expect(typeof contextValue.signMessage).toBe('function')
    })
  })

  it('should use custom config when provided', async () => {
    const customConfig = {
      network: 'mainnet' as const,
    }

    render(
      <Web3AuthProvider config={customConfig}>
        <TestComponent />
      </Web3AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('connection-status')).toHaveTextContent('disconnected')
    })
  })

  it('should handle provider accountsChanged event and auto-disconnect', async () => {
    const mockProvider = {
      request: vi.fn().mockResolvedValue(['0x1234567890123456789012345678901234567890']),
      on: vi.fn(),
      removeListener: vi.fn(),
    }

    const mockWeb3Auth = {
      initModal: vi.fn().mockResolvedValue(undefined),
      connect: vi.fn().mockResolvedValue(mockProvider),
      logout: vi.fn().mockResolvedValue(undefined),
      getUserInfo: vi.fn().mockResolvedValue({
        email: 'test@example.com',
        name: 'Test User',
      }),
      connected: false,
      provider: null,
    }

    const { Web3Auth } = await import('@web3auth/modal')
    vi.mocked(Web3Auth).mockImplementation(() => mockWeb3Auth as any)

    const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {})

    render(
      <Web3AuthProvider>
        <TestComponent />
      </Web3AuthProvider>
    )

    // Wait for initialization
    await waitFor(() => {
      expect(mockWeb3Auth.initModal).toHaveBeenCalled()
    })

    // Simulate connection
    await waitFor(() => {
      const connectButton = screen.getByText('Connect')
      connectButton.click()
    })

    // Wait for connection to complete
    await waitFor(() => {
      expect(mockProvider.on).toHaveBeenCalled()
    })

    // Get the accountsChanged handler
    const accountsChangedHandler = mockProvider.on.mock.calls.find(
      (call) => call[0] === 'accountsChanged'
    )?.[1]

    expect(accountsChangedHandler).toBeDefined()

    // Simulate account change
    if (accountsChangedHandler) {
      await accountsChangedHandler(['0xNewAddress'])
    }

    // Verify auto-disconnect was triggered
    await waitFor(() => {
      expect(consoleLog).toHaveBeenCalledWith('Accounts changed, auto-disconnecting...')
    })

    consoleLog.mockRestore()
  })

  it('should handle provider disconnect event', async () => {
    const mockProvider = {
      request: vi.fn().mockResolvedValue(['0x1234567890123456789012345678901234567890']),
      on: vi.fn(),
      removeListener: vi.fn(),
    }

    const mockWeb3Auth = {
      initModal: vi.fn().mockResolvedValue(undefined),
      connect: vi.fn().mockResolvedValue(mockProvider),
      logout: vi.fn().mockResolvedValue(undefined),
      getUserInfo: vi.fn().mockResolvedValue({
        email: 'test@example.com',
        name: 'Test User',
      }),
      connected: false,
      provider: null,
    }

    const { Web3Auth } = await import('@web3auth/modal')
    vi.mocked(Web3Auth).mockImplementation(() => mockWeb3Auth as any)

    const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {})

    render(
      <Web3AuthProvider>
        <TestComponent />
      </Web3AuthProvider>
    )

    // Wait for initialization
    await waitFor(() => {
      expect(mockWeb3Auth.initModal).toHaveBeenCalled()
    })

    // Simulate connection
    await waitFor(() => {
      const connectButton = screen.getByText('Connect')
      connectButton.click()
    })

    // Wait for connection to complete
    await waitFor(() => {
      expect(mockProvider.on).toHaveBeenCalled()
    })

    // Get the disconnect handler
    const disconnectHandler = mockProvider.on.mock.calls.find(
      (call) => call[0] === 'disconnect'
    )?.[1]

    expect(disconnectHandler).toBeDefined()

    // Simulate disconnect
    if (disconnectHandler) {
      disconnectHandler()
    }

    // Verify disconnect was handled
    await waitFor(() => {
      expect(consoleLog).toHaveBeenCalledWith('Provider disconnected')
      expect(screen.getByTestId('connection-status')).toHaveTextContent('disconnected')
    })

    consoleLog.mockRestore()
  })

  it('should cleanup event listeners on unmount', async () => {
    const mockProvider = {
      request: vi.fn().mockResolvedValue(['0x1234567890123456789012345678901234567890']),
      on: vi.fn(),
      removeListener: vi.fn(),
    }

    const mockWeb3Auth = {
      initModal: vi.fn().mockResolvedValue(undefined),
      connect: vi.fn().mockResolvedValue(mockProvider),
      logout: vi.fn().mockResolvedValue(undefined),
      getUserInfo: vi.fn().mockResolvedValue({
        email: 'test@example.com',
        name: 'Test User',
      }),
      connected: false,
      provider: null,
    }

    const { Web3Auth } = await import('@web3auth/modal')
    vi.mocked(Web3Auth).mockImplementation(() => mockWeb3Auth as any)

    const { unmount } = render(
      <Web3AuthProvider>
        <TestComponent />
      </Web3AuthProvider>
    )

    // Wait for initialization
    await waitFor(() => {
      expect(mockWeb3Auth.initModal).toHaveBeenCalled()
    })

    // Simulate connection
    await waitFor(() => {
      const connectButton = screen.getByText('Connect')
      connectButton.click()
    })

    // Wait for connection to complete
    await waitFor(() => {
      expect(mockProvider.on).toHaveBeenCalled()
    })

    // Unmount component
    unmount()

    // Verify event listeners were removed
    await waitFor(() => {
      expect(mockProvider.removeListener).toHaveBeenCalledWith('accountsChanged', expect.any(Function))
      expect(mockProvider.removeListener).toHaveBeenCalledWith('disconnect', expect.any(Function))
    })
  })
})
