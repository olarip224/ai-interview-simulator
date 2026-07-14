import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SessionCard } from '@/components/interviews/SessionCard'
import type { Session } from '@/types/interview'

const activeSession: Session = {
  id: 'abc-123',
  interview_type: 'swe',
  difficulty: 'mid',
  status: 'active',
  started_at: '2026-01-01T00:00:00Z',
  completed_at: null,
  overall_score: null,
}

describe('SessionCard', () => {
  it('links an active session to the interview room and shows no score', () => {
    render(<SessionCard session={activeSession} />)

    expect(screen.getByText('Software Engineering')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /continue/i })).toHaveAttribute('href', '/interviews/abc-123')
    expect(screen.queryByText(/score:/i)).not.toBeInTheDocument()
  })

  it('links a completed session to the feedback page and shows its score', () => {
    const completedSession: Session = {
      ...activeSession,
      status: 'completed',
      completed_at: '2026-01-01T01:00:00Z',
      overall_score: 8.456,
    }
    render(<SessionCard session={completedSession} />)

    expect(screen.getByText('Completed')).toBeInTheDocument()
    expect(screen.getByText('Score: 8.5')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /view feedback/i })).toHaveAttribute(
      'href',
      '/interviews/abc-123/feedback'
    )
  })
})
