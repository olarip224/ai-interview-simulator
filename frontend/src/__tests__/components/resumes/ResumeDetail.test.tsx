import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ResumeDetail } from '@/components/resumes/ResumeDetail'
import type { ResumeDetail as ResumeDetailType } from '@/types/resume'

const NOW = new Date('2026-01-01T00:05:00Z')

const baseDetail: ResumeDetailType = {
  id: 'abc',
  filename: 'my-resume.pdf',
  is_active: true,
  created_at: '2026-01-01T00:04:50Z',
  parsed_data: null,
}

describe('ResumeDetail', () => {
  it('shows a processing message while parsed_data is null and under the stall threshold', () => {
    render(<ResumeDetail detail={baseDetail} onRetry={vi.fn()} now={NOW} />)

    expect(screen.getByText(/still analyzing/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /retry analysis/i })).not.toBeInTheDocument()
  })

  it('shows a retry action once past the stall threshold', async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn()
    const stalledDetail = { ...baseDetail, created_at: '2026-01-01T00:00:00Z' }

    render(<ResumeDetail detail={stalledDetail} onRetry={onRetry} now={NOW} />)

    expect(screen.getByText(/taking longer than expected/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /retry analysis/i }))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('renders parsed data once analyzed', () => {
    const analyzedDetail: ResumeDetailType = {
      ...baseDetail,
      parsed_data: {
        skills: ['Python', 'React'],
        experience: [{ title: 'Engineer', company: 'Acme', duration: '2020 - 2023', description: 'Built things' }],
        education: [{ degree: 'BSc CS', institution: 'State University', year: '2019' }],
        summary: 'A capable engineer.',
      },
    }

    render(<ResumeDetail detail={analyzedDetail} onRetry={vi.fn()} now={NOW} />)

    expect(screen.getByText('A capable engineer.')).toBeInTheDocument()
    expect(screen.getByText('Python')).toBeInTheDocument()
    expect(screen.getByText('React')).toBeInTheDocument()
    expect(screen.getByText('Engineer')).toBeInTheDocument()
    expect(screen.getByText(/Acme/)).toBeInTheDocument()
    expect(screen.getByText('BSc CS')).toBeInTheDocument()
    expect(screen.getByText(/State University/)).toBeInTheDocument()
  })
})
