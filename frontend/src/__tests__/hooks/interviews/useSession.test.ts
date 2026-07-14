import { describe, it, expect, vi, beforeEach } from 'vitest'
import { waitFor } from '@testing-library/react'
import { renderHookWithQueryClient } from '@/__tests__/test-utils'

vi.mock('@/lib/interviews-api', () => ({
  getSession: vi.fn(),
}))

const { getSession } = await import('@/lib/interviews-api')
const { useSession } = await import('@/hooks/interviews/useSession')

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useSession', () => {
  it('fetches the session detail for the given id', async () => {
    const detail = {
      id: 'abc',
      interview_type: 'swe',
      difficulty: 'mid',
      status: 'active',
      started_at: '2026-01-01T00:00:00Z',
      completed_at: null,
      overall_score: null,
      questions: [],
    }
    ;(getSession as ReturnType<typeof vi.fn>).mockResolvedValue(detail)

    const { result } = renderHookWithQueryClient(() => useSession('abc'))

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(getSession).toHaveBeenCalledWith('abc')
    expect(result.current.data).toEqual(detail)
  })
})
