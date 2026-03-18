/**
 * API error interface
 */
export interface APIError {
  code: string
  message: string
  details?: Record<string, any>
}

/**
 * API response wrapper
 */
export interface APIResponse<T> {
  success: boolean
  data?: T
  error?: APIError
  message?: string
}

/**
 * API request options
 */
export interface APIRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  headers?: Record<string, string>
  body?: any
  params?: Record<string, string | number | boolean>
  timeout?: number
  retries?: number
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page?: number
  pageSize?: number
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}
