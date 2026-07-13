import { describe, it, expect, vi, beforeEach } from 'vitest'
import { waitFor } from '@testing-library/react'
import { renderHookWithQueryClient } from '@/__tests__/test-utils'
import { resumeKeys } from '@/hooks/resumes/keys'

vi.mock('@/lib/resumes-api', () => ({
  deleteResume: vi.fn(),
}))

const { deleteResume } = await import('@/lib/resumes-api')
const { useDeleteResume } = await import('@/hooks/resumes/useDeleteResume')

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useDeleteResume', () => {
  it('invalidates the resumes list query on successful delete', async () => {
    ;(deleteResume as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)

    const { result, queryClient } = renderHookWithQueryClient(() => useDeleteResume())
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    result.current.mutate('resume-1')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect((deleteResume as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe('resume-1')
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: resumeKeys.lists() })
  })
})
