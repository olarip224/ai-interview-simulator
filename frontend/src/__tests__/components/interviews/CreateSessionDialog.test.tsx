import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const pushMock = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}))
vi.mock('@/lib/interviews-api', () => ({
  createSession: vi.fn(),
}))
vi.mock('@/lib/resumes-api', () => ({
  listResumes: vi.fn(),
}))
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

const { createSession } = await import('@/lib/interviews-api')
const { listResumes } = await import('@/lib/resumes-api')
const { toast } = await import('sonner')
const { CreateSessionDialog } = await import('@/components/interviews/CreateSessionDialog')

function renderWithClient() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <CreateSessionDialog />
    </QueryClientProvider>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  ;(listResumes as ReturnType<typeof vi.fn>).mockResolvedValue({ items: [], total: 0, limit: 100, offset: 0 })
})

describe('CreateSessionDialog', () => {
  it('creates a session with the default type/difficulty/no-resume and navigates to the room', async () => {
    const user = userEvent.setup()
    ;(createSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'new-session',
      interview_type: 'swe',
      difficulty: 'mid',
      status: 'active',
      started_at: '2026-01-01T00:00:00Z',
      completed_at: null,
      overall_score: null,
    })

    renderWithClient()
    await user.click(screen.getByRole('button', { name: 'New Session' }))
    await user.click(await screen.findByRole('button', { name: 'Create' }))

    await waitFor(() => expect(createSession).toHaveBeenCalled())
    expect((createSession as ReturnType<typeof vi.fn>).mock.calls[0][0]).toEqual({
      interview_type: 'swe',
      difficulty: 'mid',
      resume_id: null,
    })
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/interviews/new-session'))
  })

  it('shows an error toast and does not navigate when creation fails', async () => {
    const user = userEvent.setup()
    ;(createSession as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('failed'))

    renderWithClient()
    await user.click(screen.getByRole('button', { name: 'New Session' }))
    await user.click(await screen.findByRole('button', { name: 'Create' }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Failed to create session'))
    expect(pushMock).not.toHaveBeenCalled()
  })
})
