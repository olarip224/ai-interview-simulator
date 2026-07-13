import { describe, it, expect, vi, beforeEach } from 'vitest'
import { waitFor } from '@testing-library/react'
import { renderHookWithQueryClient } from '@/__tests__/test-utils'

vi.mock('@/lib/resumes-api', () => ({
  getResume: vi.fn(),
}))

const { getResume } = await import('@/lib/resumes-api')
const { useResume } = await import('@/hooks/resumes/useResume')

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useResume', () => {
  it('fetches the detail for the given id', async () => {
    const detail = { id: 'abc', filename: 'r.pdf', is_active: true, created_at: '2026-01-01T00:00:00Z', parsed_data: null }
    ;(getResume as ReturnType<typeof vi.fn>).mockResolvedValue(detail)

    const { result } = renderHookWithQueryClient(() => useResume('abc'))

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(getResume).toHaveBeenCalledWith('abc')
    expect(result.current.data).toEqual(detail)
  })
})
