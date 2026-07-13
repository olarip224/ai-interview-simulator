import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '@/components/ui/button'
import { ResumeDeleteDialog } from '@/components/resumes/ResumeDeleteDialog'

describe('ResumeDeleteDialog', () => {
  it('does not call onConfirm until the delete action is confirmed', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()

    render(
      <ResumeDeleteDialog filename="resume.pdf" onConfirm={onConfirm} trigger={<Button>Open delete dialog</Button>} />
    )

    expect(onConfirm).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Open delete dialog' }))
    await screen.findByText(/delete resume/i)
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('calls onConfirm when the destructive action is clicked', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()

    render(
      <ResumeDeleteDialog filename="resume.pdf" onConfirm={onConfirm} trigger={<Button>Open delete dialog</Button>} />
    )

    await user.click(screen.getByRole('button', { name: 'Open delete dialog' }))
    await user.click(await screen.findByRole('button', { name: /^delete$/i, hidden: false }))

    await waitFor(() => expect(onConfirm).toHaveBeenCalledOnce())
  })

  it('does not call onConfirm when cancelled', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()

    render(
      <ResumeDeleteDialog filename="resume.pdf" onConfirm={onConfirm} trigger={<Button>Open delete dialog</Button>} />
    )

    await user.click(screen.getByRole('button', { name: 'Open delete dialog' }))
    await user.click(await screen.findByRole('button', { name: /cancel/i }))

    expect(onConfirm).not.toHaveBeenCalled()
  })
})
