import { describe, it, expect } from 'vitest'
import { getSubmitErrorMessage } from '@/components/challenges/submit-helpers'

describe('getSubmitErrorMessage', () => {
  it('returns a rate-limit message for 429 responses', () => {
    const error = { response: { status: 429 } }
    expect(getSubmitErrorMessage(error)).toBe('Too many submissions — try again in a minute.')
  })

  it('passes through the backend detail message for other error responses', () => {
    const error = { response: { status: 404, data: { detail: 'CodingChallenge not found' } } }
    expect(getSubmitErrorMessage(error)).toBe('CodingChallenge not found')
  })

  it('falls back to a generic message for unrecognized errors', () => {
    expect(getSubmitErrorMessage(new Error('network down'))).toBe('Failed to submit your solution. Please try again.')
  })
})
