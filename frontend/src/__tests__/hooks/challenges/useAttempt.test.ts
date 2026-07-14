import { describe, it, expect, vi, beforeEach } from 'vitest'
import { waitFor } from '@testing-library/react'
import { renderHookWithQueryClient } from '@/__tests__/test-utils'

vi.mock('@/lib/challenges-api', () => ({
  getAttempt: vi.fn(),
}))

const { getAttempt } = await import('@/lib/challenges-api')
const { useAttempt } = await import('@/hooks/challenges/useAttempt')

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useAttempt', () => {
  it('fetches the attempt detail for the given id', async () => {
    const detail = {
      id: 'att-1',
      challenge_id: 'ch-1',
      language: 'python',
      code_text: 'print(1)',
      overall_score: 8,
      correctness_score: 9,
      efficiency_score: 7,
      style_score: 8,
      is_correct: true,
      feedback_text: 'Nice work.',
      strengths: [],
      weaknesses: [],
      suggestions: [],
      time_taken_seconds: 42,
      submitted_at: '2026-01-01T00:00:00Z',
    }
    ;(getAttempt as ReturnType<typeof vi.fn>).mockResolvedValue(detail)

    const { result } = renderHookWithQueryClient(() => useAttempt('att-1'))

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(getAttempt).toHaveBeenCalledWith('att-1')
    expect(result.current.data).toEqual(detail)
  })
})
