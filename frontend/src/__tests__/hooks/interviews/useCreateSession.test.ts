import { describe, it, expect, vi, beforeEach } from 'vitest'
import { waitFor } from '@testing-library/react'
import { renderHookWithQueryClient } from '@/__tests__/test-utils'
import { sessionKeys } from '@/hooks/interviews/keys'

vi.mock('@/lib/interviews-api', () => ({
  createSession: vi.fn(),
}))

const { createSession } = await import('@/lib/interviews-api')
const { useCreateSession } = await import('@/hooks/interviews/useCreateSession')

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useCreateSession', () => {
  it('invalidates the sessions list query on successful creation', async () => {
    const created = {
      id: 'new-1',
      interview_type: 'swe',
      difficulty: 'mid',
      status: 'active',
      started_at: '2026-01-01T00:00:00Z',
      completed_at: null,
      overall_score: null,
    }
    ;(createSession as ReturnType<typeof vi.fn>).mockResolvedValue(created)

    const { result, queryClient } = renderHookWithQueryClient(() => useCreateSession())
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    result.current.mutate({ interview_type: 'swe', difficulty: 'mid' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect((createSession as ReturnType<typeof vi.fn>).mock.calls[0][0]).toEqual({
      interview_type: 'swe',
      difficulty: 'mid',
    })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: sessionKeys.lists() })
  })
})
