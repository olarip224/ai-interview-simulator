import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SessionStatusBadge } from '@/components/interviews/SessionStatusBadge'

describe('SessionStatusBadge', () => {
  it('shows "Active" for an active session', () => {
    render(<SessionStatusBadge status="active" />)
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('shows "Completed" for a completed session', () => {
    render(<SessionStatusBadge status="completed" />)
    expect(screen.getByText('Completed')).toBeInTheDocument()
  })

  it('shows "Abandoned" for an abandoned session', () => {
    render(<SessionStatusBadge status="abandoned" />)
    expect(screen.getByText('Abandoned')).toBeInTheDocument()
  })
})
