import { describe, it, expect, vi, beforeEach } from 'vitest'
import { waitFor } from '@testing-library/react'
import { renderHookWithQueryClient } from '@/__tests__/test-utils'

vi.mock('@/lib/interviews-api', () => ({
  listSessions: vi.fn(),
}))

const { listSessions } = await import('@/lib/interviews-api')
const { useSessions } = await import('@/hooks/interviews/useSessions')

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useSessions', () => {
  it('fetches the list with the given params', async () => {
    const page = { items: [], total: 0, limit: 12, offset: 0 }
    ;(listSessions as ReturnType<typeof vi.fn>).mockResolvedValue(page)

    const { result } = renderHookWithQueryClient(() => useSessions({ limit: 12, offset: 0, status: 'active' }))

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(listSessions).toHaveBeenCalledWith({ limit: 12, offset: 0, status: 'active' })
    expect(result.current.data).toEqual(page)
  })
})
