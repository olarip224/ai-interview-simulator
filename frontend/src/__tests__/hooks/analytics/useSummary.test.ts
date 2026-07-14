import { describe, it, expect, vi, beforeEach } from 'vitest'
import { waitFor } from '@testing-library/react'
import { renderHookWithQueryClient } from '@/__tests__/test-utils'

vi.mock('@/lib/analytics-api', () => ({
  getSummary: vi.fn(),
}))

const { getSummary } = await import('@/lib/analytics-api')
const { useSummary } = await import('@/hooks/analytics/useSummary')

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useSummary', () => {
  it('fetches the summary', async () => {
    const summary = {
      total_sessions: 3,
      avg_overall_score: 7.5,
      avg_technical_score: 8,
      avg_communication_score: 7,
      avg_correctness_score: null,
      top_weak_topics: ['recursion'],
      by_interview_type: [{ interview_type: 'swe', sessions: 3, avg_score: 7.5 }],
    }
    ;(getSummary as ReturnType<typeof vi.fn>).mockResolvedValue(summary)

    const { result } = renderHookWithQueryClient(() => useSummary())

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(getSummary).toHaveBeenCalled()
    expect(result.current.data).toEqual(summary)
  })
})
