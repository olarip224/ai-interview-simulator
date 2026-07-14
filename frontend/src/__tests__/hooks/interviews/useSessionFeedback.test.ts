import { describe, it, expect, vi, beforeEach } from 'vitest'
import { waitFor } from '@testing-library/react'
import { renderHookWithQueryClient } from '@/__tests__/test-utils'

vi.mock('@/lib/interviews-api', () => ({
  getSessionFeedback: vi.fn(),
}))

const { getSessionFeedback } = await import('@/lib/interviews-api')
const { useSessionFeedback } = await import('@/hooks/interviews/useSessionFeedback')

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useSessionFeedback', () => {
  it('fetches the feedback detail for the given session id', async () => {
    const detail = { session_id: 'abc', overall_score: null, per_question: [], strengths: [], weaknesses: [] }
    ;(getSessionFeedback as ReturnType<typeof vi.fn>).mockResolvedValue(detail)

    const { result } = renderHookWithQueryClient(() => useSessionFeedback('abc'))

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(getSessionFeedback).toHaveBeenCalledWith('abc')
    expect(result.current.data).toEqual(detail)
  })
})
