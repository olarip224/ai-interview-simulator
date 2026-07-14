import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ChallengeCard } from '@/components/challenges/ChallengeCard'
import type { Challenge } from '@/types/challenge'

const challenge: Challenge = {
  id: 'abc-123',
  title: 'Two Sum',
  difficulty: 'easy',
  tags: ['arrays', 'hash-map'],
  created_at: '2026-01-01T00:00:00Z',
}

describe('ChallengeCard', () => {
  it('renders the title, difficulty badge, tags, and a link to the detail page', () => {
    render(<ChallengeCard challenge={challenge} />)

    expect(screen.getByText('Two Sum')).toBeInTheDocument()
    expect(screen.getByText('Easy')).toBeInTheDocument()
    expect(screen.getByText('arrays')).toBeInTheDocument()
    expect(screen.getByText('hash-map')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /solve/i })).toHaveAttribute('href', '/challenges/abc-123')
  })
})
