import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ChallengeDifficultyBadge } from '@/components/challenges/ChallengeDifficultyBadge'

describe('ChallengeDifficultyBadge', () => {
  it('shows "Easy" for easy', () => {
    render(<ChallengeDifficultyBadge difficulty="easy" />)
    expect(screen.getByText('Easy')).toBeInTheDocument()
  })

  it('shows "Medium" for medium', () => {
    render(<ChallengeDifficultyBadge difficulty="medium" />)
    expect(screen.getByText('Medium')).toBeInTheDocument()
  })

  it('shows "Hard" for hard', () => {
    render(<ChallengeDifficultyBadge difficulty="hard" />)
    expect(screen.getByText('Hard')).toBeInTheDocument()
  })
})
