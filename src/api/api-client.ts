/**
 * Base API Client for User Center SDK
 * 
 * Provides a centralized fetch wrapper with:
 * - Automatic token injection from NextAuth session
 * - Response parsing and error handling
 * - Automatic token refresh on 401 responses
 * - Request retry logic
 * 
 * @module api/api-client
 */

import { getSDKConfig } from '../config/sdk-config'
import type { APIRequestOptions, APIResponse } from '../types/api'
import { 
  withRetry, 
  withTimeout, 
  APIError, 
  NetworkError, 
  TimeoutError,
  normalizeError,
  type RetryOptions 
} from '../utils/error-handling'

/**
 * API Client error class (deprecated - use APIError from error-handling utils)
 * @deprecated Use APIError from '../utils/error-handling' instead
 */
export class APIClientError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
    public details?: Record<string, any>
  ) {
    super(message)
    this.name = 'APIClientError'
  }
}

/**
 * Token refresh callback type
 * This will be set by the auth module to handle token refresh
 */
type TokenRefreshCallback = () => Promise<string | null>

let tokenRefreshCallback: TokenRefreshCallback | null = null

/**
 * Set the token refresh callback
 * This should be called by the auth module during initialization
 */
export function setTokenRefreshCallback(callback: TokenRefreshCallback): void {
  tokenRefreshCallback = callback
}

/**
 * Get the current access token
 * This will be implemented to integrate with NextAuth session
 */
let getAccessToken: (() => Promise<string | null>) | null = null

/**
 * Set the access token getter function
 * This should be called by the auth module during initialization
 */
export function setAccessTokenGetter(getter: () => Promise<string | null>): void {
  getAccessToken = getter
}

/**
 * Base API Client class
 */
export class APIClient {
  private baseUrl: string
  private appId: string
  private defaultHeaders: Record<string, string>

  constructor(baseUrl?: string, appId?: string) {
    const config = getSDKConfig()
    this.baseUrl = baseUrl || config.userCenterUrl
    this.appId = appId || config.appId
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'X-App-Id': this.appId,
    }
  }

  /**
   * Build URL with query parameters
   */
  private buildUrl(endpoint: string, params?: Record<string, string | number | boolean>): string {
    const url = new URL(endpoint, this.baseUrl)
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, String(value))
      })
    }
    
    return url.toString()
  }

  /**
   * Get authorization headers with current access token
   */
  private async getAuthHeaders(): Promise<Record<string, string>> {
    if (!getAccessToken) {
      return {}
    }

    const token = await getAccessToken()
    if (!token) {
      return {}
    }

    return {
      Authorization: `Bearer ${token}`,
    }
  }

  /**
   * Parse API response
   */
  private async parseResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get('content-type')
    
    // Handle empty responses
    if (response.status === 204 || !contentType) {
      return {} as T
    }

    // Parse JSON response
    if (contentType.includes('application/json')) {
      const data = await response.json()
      
      // Handle APIResponse wrapper format
      // Check for both 'success' and ('data' or 'error') to avoid false positives
      if (typeof data === 'object' && 'success' in data && ('data' in data || 'error' in data)) {
        const apiResponse = data as APIResponse<T>
        
        if (!apiResponse.success && apiResponse.error) {
          throw new APIError(
            apiResponse.error.message,
            apiResponse.error.code,
            response.status,
            apiResponse.error.details
          )
        }
        
        return apiResponse.data as T
      }
      
      return data as T
    }

    // Handle text response
    const text = await response.text()
    return text as unknown as T
  }

  /**
   * Handle API errors
   */
  private async handleError(response: Response): Promise<never> {
    let errorMessage = `API request failed: ${response.status} ${response.statusText}`
    let errorCode = `HTTP_${response.status}`
    let errorDetails: Record<string, any> | undefined

    try {
      const contentType = response.headers.get('content-type')
      if (contentType?.includes('application/json')) {
        const errorData = await response.json()
        
        if (errorData.error) {
          errorMessage = errorData.error.message || errorMessage
          errorCode = errorData.error.code || errorCode
          errorDetails = errorData.error.details
        } else if (errorData.message) {
          errorMessage = errorData.message
        }
      }
    } catch (parseError) {
      // If parsing fails, use default error message
      console.warn('Failed to parse error response:', parseError)
    }

    throw new APIError(errorMessage, errorCode, response.status, errorDetails)
  }

  /**
   * Make HTTP request with automatic token injection, retry logic, and timeout
   */
  async request<T>(
    endpoint: string,
    options: APIRequestOptions = {}
  ): Promise<T> {
    const {
      method = 'GET',
      headers = {},
      body,
      params,
      timeout = 30000,
      retries = 3,
    } = options

    // Create the actual request function
    const makeRequest = async (): Promise<T> => {
      const url = this.buildUrl(endpoint, params)
      const authHeaders = await this.getAuthHeaders()

      const requestHeaders = {
        ...this.defaultHeaders,
        ...authHeaders,
        ...headers,
      }

      const requestInit: RequestInit = {
        method,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : undefined,
      }

      try {
        const response = await fetch(url, requestInit)

        // Handle 401 Unauthorized - attempt token refresh
        if (response.status === 401 && tokenRefreshCallback) {
          console.log('Received 401, attempting token refresh...')
          
          const newToken = await tokenRefreshCallback()
          
          if (newToken) {
            // Retry request with new token
            const retryHeaders = {
              ...requestHeaders,
              Authorization: `Bearer ${newToken}`,
            }

            const retryResponse = await fetch(url, {
              ...requestInit,
              headers: retryHeaders,
            })

            if (!retryResponse.ok) {
              return this.handleError(retryResponse)
            }

            return this.parseResponse<T>(retryResponse)
          }
          
          // If refresh failed, throw error
          return this.handleError(response)
        }

        // Handle other error responses
        if (!response.ok) {
          return this.handleError(response)
        }

        return this.parseResponse<T>(response)
      } catch (error) {
        // Handle network errors
        if (error instanceof TypeError) {
          throw new NetworkError(
            'Network error occurred',
            error
          )
        }

        // Re-throw known errors
        if (error instanceof APIError) {
          throw error
        }

        // Handle unknown errors
        throw normalizeError(error)
      }
    }

    // Apply timeout wrapper
    const requestWithTimeout = () => withTimeout(
      makeRequest,
      timeout,
      `Request to ${endpoint} timed out after ${timeout}ms`
    )

    // Apply retry logic if retries > 0
    if (retries > 0) {
      const retryOptions: Partial<RetryOptions> = {
        maxAttempts: retries + 1, // +1 because maxAttempts includes the initial attempt
        shouldRetry: (error: Error, _attempt: number) => {
          // Don't retry authentication errors or user rejections
          if (error instanceof APIError) {
            if (error.statusCode === 401 || error.statusCode === 403) {
              return false
            }
            // Retry on 5xx server errors and 429 rate limiting
            return error.statusCode ? error.statusCode >= 500 || error.statusCode === 429 : false
          }
          
          // Retry on network errors and timeouts
          return error instanceof NetworkError || error instanceof TimeoutError
        }
      }

      return withRetry(requestWithTimeout, retryOptions)
    }

    return requestWithTimeout()
  }

  /**
   * Convenience methods for common HTTP verbs
   */

  async get<T>(endpoint: string, options?: Omit<APIRequestOptions, 'method'>): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' })
  }

  async post<T>(endpoint: string, body?: any, options?: Omit<APIRequestOptions, 'method' | 'body'>): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'POST', body })
  }

  async put<T>(endpoint: string, body?: any, options?: Omit<APIRequestOptions, 'method' | 'body'>): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'PUT', body })
  }

  async patch<T>(endpoint: string, body?: any, options?: Omit<APIRequestOptions, 'method' | 'body'>): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'PATCH', body })
  }

  async delete<T>(endpoint: string, options?: Omit<APIRequestOptions, 'method'>): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' })
  }
}

/**
 * Create a new API client instance
 */
export function createAPIClient(baseUrl?: string, appId?: string): APIClient {
  return new APIClient(baseUrl, appId)
}

/**
 * Default API client instance (singleton)
 */
let defaultClient: APIClient | null = null

/**
 * Get the default API client instance
 */
export function getAPIClient(): APIClient {
  if (!defaultClient) {
    defaultClient = createAPIClient()
  }
  return defaultClient
}

/**
 * Reset the default API client (mainly for testing)
 */
export function resetAPIClient(): void {
  defaultClient = null
}
