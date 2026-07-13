import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ResumeCard } from '@/components/resumes/ResumeCard'
import type { Resume } from '@/types/resume'

const resume: Resume = {
  id: 'abc-123',
  filename: 'my-resume.pdf',
  is_active: true,
  is_analyzed: true,
  created_at: '2026-01-01T00:00:00Z',
}

describe('ResumeCard', () => {
  it('renders the filename, a status badge, and a link to the detail page', () => {
    render(<ResumeCard resume={resume} onDelete={vi.fn()} />)

    expect(screen.getByText('my-resume.pdf')).toBeInTheDocument()
    expect(screen.getByText('Analyzed')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /view/i })).toHaveAttribute('href', '/resumes/abc-123')
  })

  it('calls onDelete with the resume id once the delete dialog is confirmed', async () => {
    const user = userEvent.setup()
    const onDelete = vi.fn()

    render(<ResumeCard resume={resume} onDelete={onDelete} />)

    await user.click(screen.getByRole('button', { name: /delete/i }))
    await user.click(await screen.findByRole('button', { name: /^delete$/i }))

    await waitFor(() => expect(onDelete).toHaveBeenCalledWith('abc-123'))
  })
})
