import { describe, it, expect, vi, beforeEach } from 'vitest'
import { waitFor } from '@testing-library/react'
import { renderHookWithQueryClient } from '@/__tests__/test-utils'
import { attemptKeys } from '@/hooks/challenges/keys'

vi.mock('@/lib/challenges-api', () => ({
  submitAttempt: vi.fn(),
}))

const { submitAttempt } = await import('@/lib/challenges-api')
const { useSubmitAttempt } = await import('@/hooks/challenges/useSubmitAttempt')

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useSubmitAttempt', () => {
  it('submits the attempt and invalidates the attempts list on success', async () => {
    const response = {
      attempt_id: 'att-1',
      feedback: {
        overall_score: 8,
        correctness_score: 9,
        efficiency_score: 7,
        style_score: 8,
        is_correct: true,
        feedback_text: 'Nice work.',
        strengths: [],
        weaknesses: [],
        suggestions: [],
      },
    }
    ;(submitAttempt as ReturnType<typeof vi.fn>).mockResolvedValue(response)

    const { result, queryClient } = renderHookWithQueryClient(() => useSubmitAttempt())
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    result.current.mutate({
      challengeId: 'ch-1',
      data: { language: 'python', code_text: 'print(1)', time_taken_seconds: 30 },
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(submitAttempt).toHaveBeenCalledWith('ch-1', {
      language: 'python',
      code_text: 'print(1)',
      time_taken_seconds: 30,
    })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: attemptKeys.lists() })
  })
})
