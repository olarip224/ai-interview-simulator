import { describe, it, expect, vi, beforeEach } from 'vitest'
import { waitFor } from '@testing-library/react'
import { renderHookWithQueryClient } from '@/__tests__/test-utils'

vi.mock('@/lib/resumes-api', () => ({
  listResumes: vi.fn(),
}))

const { listResumes } = await import('@/lib/resumes-api')
const { useResumes } = await import('@/hooks/resumes/useResumes')

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useResumes', () => {
  it('fetches the list with the given params', async () => {
    const page = { items: [], total: 0, limit: 20, offset: 0 }
    ;(listResumes as ReturnType<typeof vi.fn>).mockResolvedValue(page)

    const { result } = renderHookWithQueryClient(() => useResumes({ limit: 20, offset: 0 }))

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(listResumes).toHaveBeenCalledWith({ limit: 20, offset: 0 })
    expect(result.current.data).toEqual(page)
  })
})
