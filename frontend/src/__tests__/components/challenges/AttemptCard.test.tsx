import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

vi.mock('@/lib/challenges-api', () => ({
  getChallenge: vi.fn(),
}))

const { getChallenge } = await import('@/lib/challenges-api')
const { AttemptCard } = await import('@/components/challenges/AttemptCard')

const attempt = {
  id: 'att-1',
  challenge_id: 'ch-1',
  language: 'python',
  overall_score: 8.4,
  is_correct: true,
  submitted_at: '2026-01-01T00:00:00Z',
}

function renderWithClient() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <AttemptCard attempt={attempt} />
    </QueryClientProvider>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('AttemptCard', () => {
  it('shows a loading placeholder before the challenge title resolves, then the title', async () => {
    ;(getChallenge as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'ch-1', title: 'Two Sum' })

    renderWithClient()
    expect(screen.getByText(/loading challenge/i)).toBeInTheDocument()

    await waitFor(() => expect(screen.getByText('Two Sum')).toBeInTheDocument())
    expect(getChallenge).toHaveBeenCalledWith('ch-1')
  })

  it('shows the language, correctness badge, score, and a link to the attempt detail', async () => {
    ;(getChallenge as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'ch-1', title: 'Two Sum' })

    renderWithClient()

    expect(screen.getByText(/python/i)).toBeInTheDocument()
    expect(screen.getByText('Correct')).toBeInTheDocument()
    expect(screen.getByText('Score: 8.4')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /view/i })).toHaveAttribute('href', '/challenges/me/attempts/att-1')
  })
})
