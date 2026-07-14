import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ErrorBoundary from '@/app/error'

describe('Error boundary', () => {
  it('shows a generic message and calls reset() when retried', async () => {
    const user = userEvent.setup()
    const reset = vi.fn()
    const error = Object.assign(new Error('boom'), { digest: 'abc123' })

    render(<ErrorBoundary error={error} reset={reset} />)

    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /try again/i }))
    expect(reset).toHaveBeenCalledOnce()
  })
})
