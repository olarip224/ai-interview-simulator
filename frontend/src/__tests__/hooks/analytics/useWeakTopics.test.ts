import { describe, it, expect, vi, beforeEach } from 'vitest'
import { waitFor } from '@testing-library/react'
import { renderHookWithQueryClient } from '@/__tests__/test-utils'

vi.mock('@/lib/analytics-api', () => ({
  getWeakTopics: vi.fn(),
}))

const { getWeakTopics } = await import('@/lib/analytics-api')
const { useWeakTopics } = await import('@/hooks/analytics/useWeakTopics')

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useWeakTopics', () => {
  it('fetches the weak topics list', async () => {
    const topics = [{ topic: 'recursion', count: 4 }]
    ;(getWeakTopics as ReturnType<typeof vi.fn>).mockResolvedValue(topics)

    const { result } = renderHookWithQueryClient(() => useWeakTopics())

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(getWeakTopics).toHaveBeenCalled()
    expect(result.current.data).toEqual(topics)
  })
})
