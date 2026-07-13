import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}))

const { default: apiClient } = await import('@/lib/api')
const { uploadResume, listResumes, getResume, reanalyzeResume, deleteResume } = await import('@/lib/resumes-api')

beforeEach(() => {
  vi.clearAllMocks()
})

describe('uploadResume', () => {
  it('posts a FormData body to /resumes with Content-Type unset so axios sets the multipart boundary', async () => {
    const file = new File(['%PDF-1.4'], 'resume.pdf', { type: 'application/pdf' })
    ;(apiClient.post as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { id: '1', filename: 'resume.pdf', is_active: true, is_analyzed: false, created_at: '2026-01-01T00:00:00Z' },
    })

    const result = await uploadResume(file)

    expect(apiClient.post).toHaveBeenCalledOnce()
    const [url, body, config] = (apiClient.post as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(url).toBe('/resumes')
    expect(body).toBeInstanceOf(FormData)
    expect((body as FormData).get('file')).toBe(file)
    expect(config.headers['Content-Type']).toBeUndefined()
    expect(result.filename).toBe('resume.pdf')
  })
})

describe('listResumes', () => {
  it('gets /resumes with limit/offset params', async () => {
    ;(apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { items: [], total: 0, limit: 50, offset: 0 },
    })

    await listResumes({ limit: 10, offset: 20 })

    expect(apiClient.get).toHaveBeenCalledWith('/resumes', { params: { limit: 10, offset: 20 } })
  })
})

describe('getResume', () => {
  it('gets /resumes/{id}', async () => {
    ;(apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { id: 'abc', filename: 'r.pdf', is_active: true, created_at: '2026-01-01T00:00:00Z', parsed_data: null },
    })

    const result = await getResume('abc')

    expect(apiClient.get).toHaveBeenCalledWith('/resumes/abc')
    expect(result.id).toBe('abc')
  })
})

describe('reanalyzeResume', () => {
  it('posts to /resumes/{id}/analyze', async () => {
    ;(apiClient.post as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { id: 'abc', filename: 'r.pdf', is_active: true, created_at: '2026-01-01T00:00:00Z', parsed_data: { skills: [], experience: [], education: [], summary: '' } },
    })

    await reanalyzeResume('abc')

    expect(apiClient.post).toHaveBeenCalledWith('/resumes/abc/analyze')
  })
})

describe('deleteResume', () => {
  it('deletes /resumes/{id}', async () => {
    ;(apiClient.delete as ReturnType<typeof vi.fn>).mockResolvedValue({})

    await deleteResume('abc')

    expect(apiClient.delete).toHaveBeenCalledWith('/resumes/abc')
  })
})
