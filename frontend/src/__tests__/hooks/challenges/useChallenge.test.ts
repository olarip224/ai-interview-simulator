import { describe, it, expect, vi, beforeEach } from 'vitest'
import { waitFor } from '@testing-library/react'
import { renderHookWithQueryClient } from '@/__tests__/test-utils'

vi.mock('@/lib/challenges-api', () => ({
  getChallenge: vi.fn(),
}))

const { getChallenge } = await import('@/lib/challenges-api')
const { useChallenge } = await import('@/hooks/challenges/useChallenge')

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useChallenge', () => {
  it('fetches the challenge detail for the given id', async () => {
    const detail = {
      id: 'abc',
      title: 'Two Sum',
      description: 'desc',
      difficulty: 'easy',
      tags: ['arrays'],
      examples: [],
      constraints: [],
      starter_code: { python: 'pass' },
      created_at: '2026-01-01T00:00:00Z',
    }
    ;(getChallenge as ReturnType<typeof vi.fn>).mockResolvedValue(detail)

    const { result } = renderHookWithQueryClient(() => useChallenge('abc'))

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(getChallenge).toHaveBeenCalledWith('abc')
    expect(result.current.data).toEqual(detail)
  })
})
