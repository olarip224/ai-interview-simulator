import { describe, it, expect, vi, beforeEach } from 'vitest'
import { waitFor } from '@testing-library/react'
import { renderHookWithQueryClient } from '@/__tests__/test-utils'
import { sessionKeys } from '@/hooks/interviews/keys'

vi.mock('@/lib/interviews-api', () => ({
  generateQuestion: vi.fn(),
}))

const { generateQuestion } = await import('@/lib/interviews-api')
const { useGenerateQuestion } = await import('@/hooks/interviews/useGenerateQuestion')

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useGenerateQuestion', () => {
  it('invalidates the session feedback and detail queries for that session on success', async () => {
    const question = {
      id: 'q1',
      sequence_order: 1,
      question_text: 'Tell me about a bug you fixed.',
      question_type: 'technical',
      created_at: '2026-01-01T00:00:00Z',
    }
    ;(generateQuestion as ReturnType<typeof vi.fn>).mockResolvedValue(question)

    const { result, queryClient } = renderHookWithQueryClient(() => useGenerateQuestion())
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    result.current.mutate('session-1')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(generateQuestion).toHaveBeenCalledWith('session-1')
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: sessionKeys.feedback('session-1') })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: sessionKeys.detail('session-1') })
  })
})
