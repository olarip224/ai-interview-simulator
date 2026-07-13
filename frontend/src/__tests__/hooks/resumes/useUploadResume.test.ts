import { describe, it, expect, vi, beforeEach } from 'vitest'
import { waitFor } from '@testing-library/react'
import { renderHookWithQueryClient } from '@/__tests__/test-utils'
import { resumeKeys } from '@/hooks/resumes/keys'

vi.mock('@/lib/resumes-api', () => ({
  uploadResume: vi.fn(),
}))

const { uploadResume } = await import('@/lib/resumes-api')
const { useUploadResume } = await import('@/hooks/resumes/useUploadResume')

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useUploadResume', () => {
  it('invalidates the resumes list query on successful upload', async () => {
    const uploaded = { id: '1', filename: 'r.pdf', is_active: true, is_analyzed: false, created_at: '2026-01-01T00:00:00Z' }
    ;(uploadResume as ReturnType<typeof vi.fn>).mockResolvedValue(uploaded)

    const { result, queryClient } = renderHookWithQueryClient(() => useUploadResume())
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    result.current.mutate(new File(['x'], 'r.pdf'))

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: resumeKeys.lists() })
  })

  it('does not invalidate on failure', async () => {
    ;(uploadResume as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('upload failed'))

    const { result, queryClient } = renderHookWithQueryClient(() => useUploadResume())
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    result.current.mutate(new File(['x'], 'r.pdf'))

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(invalidateSpy).not.toHaveBeenCalled()
  })
})
