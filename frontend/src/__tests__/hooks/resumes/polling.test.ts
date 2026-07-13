import { describe, it, expect } from 'vitest'
import { getResumeRefetchInterval, getResumesRefetchInterval } from '@/hooks/resumes/polling'
import type { PageResponse, Resume, ResumeDetail } from '@/types/resume'

const resume = (overrides: Partial<Resume> = {}): Resume => ({
  id: '1',
  filename: 'r.pdf',
  is_active: true,
  is_analyzed: false,
  created_at: '2026-01-01T00:00:00Z',
  ...overrides,
})

const detail = (overrides: Partial<ResumeDetail> = {}): ResumeDetail => ({
  id: '1',
  filename: 'r.pdf',
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
  parsed_data: null,
  ...overrides,
})

describe('getResumeRefetchInterval', () => {
  it('returns false when there is no data yet', () => {
    expect(getResumeRefetchInterval(undefined)).toBe(false)
  })

  it('returns 3000 while parsed_data is null (still processing)', () => {
    expect(getResumeRefetchInterval(detail({ parsed_data: null }))).toBe(3000)
  })

  it('returns false once parsed_data is populated (analyzed)', () => {
    expect(
      getResumeRefetchInterval(detail({ parsed_data: { skills: [], experience: [], education: [], summary: '' } }))
    ).toBe(false)
  })
})

describe('getResumesRefetchInterval', () => {
  it('returns false when there is no data yet', () => {
    expect(getResumesRefetchInterval(undefined)).toBe(false)
  })

  it('returns 3000 when any item is not yet analyzed', () => {
    const page: PageResponse<Resume> = { items: [resume({ is_analyzed: true }), resume({ id: '2', is_analyzed: false })], total: 2, limit: 50, offset: 0 }
    expect(getResumesRefetchInterval(page)).toBe(3000)
  })

  it('returns false when every item is analyzed', () => {
    const page: PageResponse<Resume> = { items: [resume({ is_analyzed: true })], total: 1, limit: 50, offset: 0 }
    expect(getResumesRefetchInterval(page)).toBe(false)
  })

  it('returns false for an empty list', () => {
    const page: PageResponse<Resume> = { items: [], total: 0, limit: 50, offset: 0 }
    expect(getResumesRefetchInterval(page)).toBe(false)
  })
})
