import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '@/components/ui/button'
import { EndInterviewDialog } from '@/components/interviews/EndInterviewDialog'

describe('EndInterviewDialog', () => {
  it('does not call onConfirm until the end action is confirmed', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()

    render(<EndInterviewDialog onConfirm={onConfirm} trigger={<Button>Open end dialog</Button>} />)

    expect(onConfirm).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Open end dialog' }))
    await screen.findByText(/end interview\?/i)
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('calls onConfirm when the destructive action is clicked', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()

    render(<EndInterviewDialog onConfirm={onConfirm} trigger={<Button>Open end dialog</Button>} />)

    await user.click(screen.getByRole('button', { name: 'Open end dialog' }))
    await user.click(await screen.findByRole('button', { name: /^end interview$/i, hidden: false }))

    await waitFor(() => expect(onConfirm).toHaveBeenCalledOnce())
  })

  it('does not call onConfirm when cancelled', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()

    render(<EndInterviewDialog onConfirm={onConfirm} trigger={<Button>Open end dialog</Button>} />)

    await user.click(screen.getByRole('button', { name: 'Open end dialog' }))
    await user.click(await screen.findByRole('button', { name: /cancel/i }))

    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('shows the unanswered-question warning copy when hasUnansweredQuestion is true', async () => {
    const user = userEvent.setup()

    render(
      <EndInterviewDialog onConfirm={vi.fn()} hasUnansweredQuestion trigger={<Button>Open end dialog</Button>} />
    )

    await user.click(screen.getByRole('button', { name: 'Open end dialog' }))
    expect(await screen.findByText(/still unanswered/i)).toBeInTheDocument()
  })
})
