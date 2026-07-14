import { describe, it, expect, vi, beforeEach } from 'vitest'
import { waitFor } from '@testing-library/react'
import { renderHookWithQueryClient } from '@/__tests__/test-utils'
import { sessionKeys } from '@/hooks/interviews/keys'

vi.mock('@/lib/interviews-api', () => ({
  completeSession: vi.fn(),
}))

const { completeSession } = await import('@/lib/interviews-api')
const { useCompleteSession } = await import('@/hooks/interviews/useCompleteSession')

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useCompleteSession', () => {
  it('invalidates detail, feedback, and list queries for that session on success', async () => {
    const result_ = { session_id: 'session-1', overall_score: 7.5, questions_answered: 3 }
    ;(completeSession as ReturnType<typeof vi.fn>).mockResolvedValue(result_)

    const { result, queryClient } = renderHookWithQueryClient(() => useCompleteSession())
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    result.current.mutate('session-1')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(completeSession).toHaveBeenCalledWith('session-1')
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: sessionKeys.detail('session-1') })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: sessionKeys.feedback('session-1') })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: sessionKeys.lists() })
  })
})
