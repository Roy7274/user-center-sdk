import { SDKConfig, SDKConfigSchema, ENV_KEYS } from './types'

/**
 * Global SDK configuration instance
 */
let sdkConfig: SDKConfig | null = null

/**
 * Load configuration from environment variables
 */
function loadFromEnv(): Partial<SDKConfig> {
  const env = typeof window !== 'undefined' ? window.process?.env : process.env

  if (!env) {
    return {}
  }

  return {
    userCenterUrl: env[ENV_KEYS.USER_CENTER_URL],
    appId: env[ENV_KEYS.APP_ID],
    web3AuthClientId: env[ENV_KEYS.WEB3AUTH_CLIENT_ID],
    web3AuthNetwork: env[ENV_KEYS.WEB3AUTH_NETWORK] as 'mainnet' | 'testnet' | 'cyan',
    bscNetwork: (env[ENV_KEYS.BSC_NETWORK] || 'testnet') as 'mainnet' | 'testnet',
    contractAddress: env[ENV_KEYS.CONTRACT_ADDRESS],
    usdtAddress: env[ENV_KEYS.USDT_ADDRESS],
    rpcUrl: env[ENV_KEYS.RPC_URL],
    nextAuthUrl: env[ENV_KEYS.NEXTAUTH_URL],
    nextAuthSecret: env[ENV_KEYS.NEXTAUTH_SECRET],
    enableGuestLogin: env[ENV_KEYS.ENABLE_GUEST_LOGIN] !== 'false',
    enableWeb3Auth: env[ENV_KEYS.ENABLE_WEB3AUTH] !== 'false',
    enableDeposit: env[ENV_KEYS.ENABLE_DEPOSIT] !== 'false',
    locale: env[ENV_KEYS.LOCALE] || 'en',
  }
}

/**
 * Initialize SDK configuration
 * @param config - Partial configuration to override environment variables
 * @returns Validated SDK configuration
 */
export function initSDKConfig(config?: Partial<SDKConfig>): SDKConfig {
  const envConfig = loadFromEnv()
  const mergedConfig = { ...envConfig, ...config }

  // Validate configuration
  const validatedConfig = SDKConfigSchema.parse(mergedConfig)

  sdkConfig = validatedConfig
  return validatedConfig
}

/**
 * Get current SDK configuration
 * @throws Error if SDK is not initialized
 */
export function getSDKConfig(): SDKConfig {
  if (!sdkConfig) {
    throw new Error(
      'SDK not initialized. Call initSDKConfig() before using the SDK.'
    )
  }
  return sdkConfig
}

/**
 * Update SDK configuration at runtime
 * @param updates - Partial configuration updates
 */
export function updateSDKConfig(updates: Partial<SDKConfig>): SDKConfig {
  if (!sdkConfig) {
    throw new Error(
      'SDK not initialized. Call initSDKConfig() before updating configuration.'
    )
  }

  const mergedConfig = { ...sdkConfig, ...updates }
  const validatedConfig = SDKConfigSchema.parse(mergedConfig)

  sdkConfig = validatedConfig
  return validatedConfig
}

/**
 * Check if SDK is initialized
 */
export function isSDKInitialized(): boolean {
  return sdkConfig !== null
}

/**
 * Reset SDK configuration (mainly for testing)
 */
export function resetSDKConfig(): void {
  sdkConfig = null
}
