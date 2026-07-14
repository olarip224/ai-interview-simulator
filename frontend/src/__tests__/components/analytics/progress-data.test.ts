import { describe, it, expect } from 'vitest'
import { getPresentInterviewTypes, sortProgressAscending, toChartRows } from '@/components/analytics/progress-data'
import type { ProgressItem } from '@/types/analytics'

const item = (overrides: Partial<ProgressItem> = {}): ProgressItem => ({
  session_id: '1',
  interview_type: 'swe',
  overall_score: 8,
  completed_at: '2026-01-01T00:00:00Z',
  ...overrides,
})

describe('sortProgressAscending', () => {
  it('sorts oldest to newest by completed_at', () => {
    const items = [
      item({ session_id: 'c', completed_at: '2026-01-03T00:00:00Z' }),
      item({ session_id: 'a', completed_at: '2026-01-01T00:00:00Z' }),
      item({ session_id: 'b', completed_at: '2026-01-02T00:00:00Z' }),
    ]
    expect(sortProgressAscending(items).map((i) => i.session_id)).toEqual(['a', 'b', 'c'])
  })

  it('does not mutate the input array', () => {
    const items = [item({ session_id: 'b', completed_at: '2026-01-02T00:00:00Z' }), item({ session_id: 'a', completed_at: '2026-01-01T00:00:00Z' })]
    const original = [...items]
    sortProgressAscending(items)
    expect(items).toEqual(original)
  })

  it('handles the backend\'s actual newest-first ordering', () => {
    const items = [
      item({ session_id: 'newest', completed_at: '2026-03-01T00:00:00Z' }),
      item({ session_id: 'oldest', completed_at: '2026-01-01T00:00:00Z' }),
    ]
    expect(sortProgressAscending(items).map((i) => i.session_id)).toEqual(['oldest', 'newest'])
  })
})

describe('getPresentInterviewTypes', () => {
  it('returns only the types present in the data, in canonical order', () => {
    const items = [item({ interview_type: 'behavioral' }), item({ interview_type: 'swe' })]
    expect(getPresentInterviewTypes(items)).toEqual(['swe', 'behavioral'])
  })

  it('returns an empty array for no items', () => {
    expect(getPresentInterviewTypes([])).toEqual([])
  })

  it('dedupes repeated types', () => {
    const items = [item({ interview_type: 'ml' }), item({ interview_type: 'ml' }), item({ interview_type: 'ml' })]
    expect(getPresentInterviewTypes(items)).toEqual(['ml'])
  })
})

describe('toChartRows', () => {
  it('maps each item to a row keyed by its own interview_type only', () => {
    const items = [
      item({ interview_type: 'swe', overall_score: 7, completed_at: '2026-01-01T00:00:00Z' }),
      item({ interview_type: 'ml', overall_score: 9, completed_at: '2026-01-02T00:00:00Z' }),
    ]
    const rows = toChartRows(items)

    expect(rows[0]).toEqual({ completed_at: '2026-01-01T00:00:00Z', swe: 7 })
    expect(rows[0].ml).toBeUndefined()
    expect(rows[1]).toEqual({ completed_at: '2026-01-02T00:00:00Z', ml: 9 })
    expect(rows[1].swe).toBeUndefined()
  })
})
