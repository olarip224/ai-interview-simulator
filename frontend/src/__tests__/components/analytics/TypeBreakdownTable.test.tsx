import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TypeBreakdownTable } from '@/components/analytics/TypeBreakdownTable'
import type { TypeBreakdownItem } from '@/types/analytics'

describe('TypeBreakdownTable', () => {
  it('renders a row per interview type with label, session count, and avg score', () => {
    const items: TypeBreakdownItem[] = [
      { interview_type: 'swe', sessions: 4, avg_score: 7.891 },
      { interview_type: 'behavioral', sessions: 2, avg_score: 9 },
    ]

    render(<TypeBreakdownTable items={items} />)

    expect(screen.getByText('Software Engineering')).toBeInTheDocument()
    expect(screen.getByText('Behavioral')).toBeInTheDocument()
    expect(screen.getByText('4')).toBeInTheDocument()
    expect(screen.getByText('7.9')).toBeInTheDocument()
    expect(screen.getByText('9.0')).toBeInTheDocument()
  })

  it('renders no rows for an empty breakdown', () => {
    render(<TypeBreakdownTable items={[]} />)
    expect(screen.queryAllByRole('row')).toHaveLength(1) // header row only
  })
})
