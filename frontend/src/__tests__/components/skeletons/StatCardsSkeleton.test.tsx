import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatCardsSkeleton } from '@/components/skeletons/StatCardsSkeleton'

describe('StatCardsSkeleton', () => {
  it('renders the default number of stat card placeholders', () => {
    const { container } = render(<StatCardsSkeleton />)
    expect(container.querySelectorAll('[data-slot="card"]')).toHaveLength(5)
  })

  it('renders the given count of stat card placeholders', () => {
    const { container } = render(<StatCardsSkeleton count={2} />)
    expect(container.querySelectorAll('[data-slot="card"]')).toHaveLength(2)
  })

  it('renders inside a labeled container', () => {
    render(<StatCardsSkeleton />)
    expect(screen.getByTestId('stat-cards-skeleton')).toBeInTheDocument()
  })
})
