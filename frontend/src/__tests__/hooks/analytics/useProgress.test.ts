import { describe, it, expect, vi, beforeEach } from 'vitest'
import { waitFor } from '@testing-library/react'
import { renderHookWithQueryClient } from '@/__tests__/test-utils'

vi.mock('@/lib/analytics-api', () => ({
  getProgress: vi.fn(),
}))

const { getProgress } = await import('@/lib/analytics-api')
const { useProgress } = await import('@/hooks/analytics/useProgress')

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useProgress', () => {
  it('fetches the progress list', async () => {
    const progress = [
      { session_id: '1', interview_type: 'swe', overall_score: 8, completed_at: '2026-01-01T00:00:00Z' },
    ]
    ;(getProgress as ReturnType<typeof vi.fn>).mockResolvedValue(progress)

    const { result } = renderHookWithQueryClient(() => useProgress())

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(getProgress).toHaveBeenCalled()
    expect(result.current.data).toEqual(progress)
  })
})
