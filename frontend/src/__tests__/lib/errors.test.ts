import { describe, it, expect } from 'vitest'
import { getApiErrorMessage } from '@/lib/errors'

const options = { rateLimitMessage: 'Slow down.', fallbackMessage: 'Something went wrong.' }

describe('getApiErrorMessage', () => {
  it('returns the rate-limit message for 429 responses', () => {
    const error = { response: { status: 429 } }
    expect(getApiErrorMessage(error, options)).toBe('Slow down.')
  })

  it('passes through the backend detail message for other error responses', () => {
    const error = { response: { status: 400, data: { detail: 'Bad request detail' } } }
    expect(getApiErrorMessage(error, options)).toBe('Bad request detail')
  })

  it('prefers the rate-limit message over a detail string when both are present on a 429', () => {
    const error = { response: { status: 429, data: { detail: 'ignored' } } }
    expect(getApiErrorMessage(error, options)).toBe('Slow down.')
  })

  it('falls back to the generic message when there is no response', () => {
    expect(getApiErrorMessage(new Error('network down'), options)).toBe('Something went wrong.')
  })

  it('falls back to the generic message when detail is not a string', () => {
    const error = { response: { status: 422, data: { detail: [{ msg: 'validation error' }] } } }
    expect(getApiErrorMessage(error, options)).toBe('Something went wrong.')
  })
})
