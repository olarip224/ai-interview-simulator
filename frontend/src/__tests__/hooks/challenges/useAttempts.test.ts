import { describe, it, expect, vi, beforeEach } from 'vitest'
import { waitFor } from '@testing-library/react'
import { renderHookWithQueryClient } from '@/__tests__/test-utils'

vi.mock('@/lib/challenges-api', () => ({
  listAttempts: vi.fn(),
}))

const { listAttempts } = await import('@/lib/challenges-api')
const { useAttempts } = await import('@/hooks/challenges/useAttempts')

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useAttempts', () => {
  it('fetches the list with the given params', async () => {
    const page = { items: [], total: 0, limit: 12, offset: 0 }
    ;(listAttempts as ReturnType<typeof vi.fn>).mockResolvedValue(page)

    const { result } = renderHookWithQueryClient(() => useAttempts({ limit: 12, offset: 0, challenge_id: 'ch-1' }))

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(listAttempts).toHaveBeenCalledWith({ limit: 12, offset: 0, challenge_id: 'ch-1' })
    expect(result.current.data).toEqual(page)
  })
})
