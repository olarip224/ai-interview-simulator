import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn(),
  },
}))

const { default: apiClient } = await import('@/lib/api')
const { getSummary, getProgress, getWeakTopics } = await import('@/lib/analytics-api')

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getSummary', () => {
  it('gets /analytics/me/summary', async () => {
    const summary = { total_sessions: 2 }
    ;(apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValue({ data: summary })

    const result = await getSummary()

    expect(apiClient.get).toHaveBeenCalledWith('/analytics/me/summary')
    expect(result).toEqual(summary)
  })
})

describe('getProgress', () => {
  it('gets /analytics/me/progress', async () => {
    const progress = [{ session_id: '1' }]
    ;(apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValue({ data: progress })

    const result = await getProgress()

    expect(apiClient.get).toHaveBeenCalledWith('/analytics/me/progress')
    expect(result).toEqual(progress)
  })
})

describe('getWeakTopics', () => {
  it('gets /analytics/me/weak-topics', async () => {
    const topics = [{ topic: 'recursion', count: 3 }]
    ;(apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValue({ data: topics })

    const result = await getWeakTopics()

    expect(apiClient.get).toHaveBeenCalledWith('/analytics/me/weak-topics')
    expect(result).toEqual(topics)
  })
})
