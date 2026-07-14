import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProgressChart } from '@/components/analytics/ProgressChart'
import type { ProgressItem } from '@/types/analytics'

const items: ProgressItem[] = [
  { session_id: '1', interview_type: 'swe', overall_score: 7, completed_at: '2026-01-01T00:00:00Z' },
  { session_id: '2', interview_type: 'ml', overall_score: 8, completed_at: '2026-01-02T00:00:00Z' },
]

describe('ProgressChart', () => {
  it('renders a legend entry for each interview type present in the data', async () => {
    render(<ProgressChart items={items} />)
    expect(await screen.findByText('Software Engineering')).toBeInTheDocument()
    expect(screen.getByText('Machine Learning')).toBeInTheDocument()
  })

  it('renders no legend for a single-series chart', async () => {
    render(<ProgressChart items={[items[0]]} />)
    // let the chart finish its async resize-driven render before asserting absence
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(screen.queryByText('Software Engineering')).not.toBeInTheDocument()
  })

  it('renders nothing when there is no data', async () => {
    render(<ProgressChart items={[]} />)
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(screen.queryByText('Software Engineering')).not.toBeInTheDocument()
  })
})
