import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ResumeStatusBadge } from '@/components/resumes/ResumeStatusBadge'

const NOW = new Date('2026-01-01T00:05:00Z')

describe('ResumeStatusBadge', () => {
  it('shows "Analyzed" when is_analyzed is true', () => {
    render(<ResumeStatusBadge isAnalyzed createdAt="2026-01-01T00:00:00Z" now={NOW} />)
    expect(screen.getByText('Analyzed')).toBeInTheDocument()
  })

  it('shows "Processing" when not analyzed and under the stall threshold', () => {
    render(<ResumeStatusBadge isAnalyzed={false} createdAt="2026-01-01T00:04:50Z" now={NOW} />)
    expect(screen.getByText('Processing')).toBeInTheDocument()
  })

  it('shows a stalled message once past the 90s threshold', () => {
    render(<ResumeStatusBadge isAnalyzed={false} createdAt="2026-01-01T00:00:00Z" now={NOW} />)
    expect(screen.getByText('Taking longer than expected')).toBeInTheDocument()
  })
})
