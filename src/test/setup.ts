import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom'
import { resetSDKConfig } from '../config'

// Reset SDK configuration after each test
afterEach(() => {
  resetSDKConfig()
  cleanup()
})
