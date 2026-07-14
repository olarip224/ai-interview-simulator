import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CardGridSkeleton } from '@/components/skeletons/CardGridSkeleton'

describe('CardGridSkeleton', () => {
  it('renders the default number of placeholder cards', () => {
    const { container } = render(<CardGridSkeleton />)
    expect(container.querySelectorAll('[data-slot="card"]')).toHaveLength(6)
  })

  it('renders the given count of placeholder cards', () => {
    const { container } = render(<CardGridSkeleton count={3} />)
    expect(container.querySelectorAll('[data-slot="card"]')).toHaveLength(3)
  })

  it('renders inside a labeled grid container', () => {
    render(<CardGridSkeleton count={2} />)
    expect(screen.getByTestId('card-grid-skeleton')).toBeInTheDocument()
  })
})
