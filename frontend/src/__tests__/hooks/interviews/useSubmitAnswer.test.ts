import { describe, it, expect, vi, beforeEach } from 'vitest'
import { waitFor } from '@testing-library/react'
import { renderHookWithQueryClient } from '@/__tests__/test-utils'
import { sessionKeys } from '@/hooks/interviews/keys'

vi.mock('@/lib/interviews-api', () => ({
  submitAnswer: vi.fn(),
}))

const { submitAnswer } = await import('@/lib/interviews-api')
const { useSubmitAnswer } = await import('@/hooks/interviews/useSubmitAnswer')

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useSubmitAnswer', () => {
  it('submits the answer and invalidates that session\'s feedback query on success', async () => {
    const result_ = {
      answer_id: 'ans-1',
      feedback: {
        overall_score: 7,
        feedback_text: 'Solid.',
        strengths: [],
        weaknesses: [],
        suggestions: [],
        technical_score: null,
        communication_score: null,
        correctness_score: null,
      },
    }
    ;(submitAnswer as ReturnType<typeof vi.fn>).mockResolvedValue(result_)

    const { result, queryClient } = renderHookWithQueryClient(() => useSubmitAnswer())
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    result.current.mutate({
      sessionId: 'session-1',
      questionId: 'q1',
      data: { answer_text: 'My answer', time_taken_seconds: 42 },
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(submitAnswer).toHaveBeenCalledWith('session-1', 'q1', { answer_text: 'My answer', time_taken_seconds: 42 })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: sessionKeys.feedback('session-1') })
  })
})
