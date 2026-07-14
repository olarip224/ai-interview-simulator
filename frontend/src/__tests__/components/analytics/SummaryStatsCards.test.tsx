import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SummaryStatsCards } from '@/components/analytics/SummaryStatsCards'
import type { UserSummary } from '@/types/analytics'

const summary: UserSummary = {
  total_sessions: 5,
  avg_overall_score: 7.456,
  avg_technical_score: 8,
  avg_communication_score: null,
  avg_correctness_score: null,
  top_weak_topics: [],
  by_interview_type: [],
}

describe('SummaryStatsCards', () => {
  it('renders total sessions and formats scores to one decimal', () => {
    render(<SummaryStatsCards summary={summary} />)

    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('7.5')).toBeInTheDocument()
    expect(screen.getByText('8.0')).toBeInTheDocument()
  })

  it('shows an em dash for null scores', () => {
    render(<SummaryStatsCards summary={summary} />)

    const dashes = screen.getAllByText('—')
    expect(dashes).toHaveLength(2)
  })
})
