import { describe, it, expect, vi, beforeEach } from 'vitest'
import { waitFor } from '@testing-library/react'
import { renderHookWithQueryClient } from '@/__tests__/test-utils'
import { resumeKeys } from '@/hooks/resumes/keys'

vi.mock('@/lib/resumes-api', () => ({
  reanalyzeResume: vi.fn(),
}))

const { reanalyzeResume } = await import('@/lib/resumes-api')
const { useReanalyzeResume } = await import('@/hooks/resumes/useReanalyzeResume')

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useReanalyzeResume', () => {
  it('writes the returned detail into the detail cache and invalidates the list on success', async () => {
    const detail = {
      id: 'abc',
      filename: 'r.pdf',
      is_active: true,
      created_at: '2026-01-01T00:00:00Z',
      parsed_data: { skills: ['Python'], experience: [], education: [], summary: 'ok' },
    }
    ;(reanalyzeResume as ReturnType<typeof vi.fn>).mockResolvedValue(detail)

    const { result, queryClient } = renderHookWithQueryClient(() => useReanalyzeResume())
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    result.current.mutate('abc')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(queryClient.getQueryData(resumeKeys.detail('abc'))).toEqual(detail)
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: resumeKeys.lists() })
  })
})
