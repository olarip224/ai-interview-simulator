import { describe, it, expect, vi, beforeEach } from 'vitest'
import { waitFor } from '@testing-library/react'
import { renderHookWithQueryClient } from '@/__tests__/test-utils'

vi.mock('@/lib/challenges-api', () => ({
  listChallenges: vi.fn(),
}))

const { listChallenges } = await import('@/lib/challenges-api')
const { useChallenges } = await import('@/hooks/challenges/useChallenges')

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useChallenges', () => {
  it('fetches the list with the given params', async () => {
    const page = { items: [], total: 0, limit: 12, offset: 0 }
    ;(listChallenges as ReturnType<typeof vi.fn>).mockResolvedValue(page)

    const { result } = renderHookWithQueryClient(() => useChallenges({ limit: 12, offset: 0, difficulty: 'easy' }))

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(listChallenges).toHaveBeenCalledWith({ limit: 12, offset: 0, difficulty: 'easy' })
    expect(result.current.data).toEqual(page)
  })
})
