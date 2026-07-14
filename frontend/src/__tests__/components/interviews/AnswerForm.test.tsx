import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

vi.mock('@/lib/interviews-api', () => ({
  submitAnswer: vi.fn(),
}))

const { submitAnswer } = await import('@/lib/interviews-api')
const { AnswerForm } = await import('@/components/interviews/AnswerForm')

const question = {
  id: 'q1',
  sequence_order: 1,
  question_text: 'Tell me about yourself.',
  question_type: 'behavioral',
  created_at: '2026-01-01T00:00:00Z',
}

const feedbackResult = {
  answer_id: 'ans-1',
  feedback: {
    overall_score: 7,
    feedback_text: 'ok',
    strengths: [],
    weaknesses: [],
    suggestions: [],
    technical_score: null,
    communication_score: null,
    correctness_score: null,
  },
}

function renderWithClient() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <AnswerForm sessionId="session-1" question={question} />
    </QueryClientProvider>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('AnswerForm', () => {
  it('submits manually with the elapsed time since the question was shown', async () => {
    vi.useFakeTimers()
    ;(submitAnswer as ReturnType<typeof vi.fn>).mockResolvedValue(feedbackResult)

    renderWithClient()
    fireEvent.change(screen.getByPlaceholderText(/type your answer/i), { target: { value: 'My answer' } })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000)
    })

    fireEvent.click(screen.getByRole('button', { name: /submit answer/i }))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })

    expect(submitAnswer).toHaveBeenCalledWith('session-1', 'q1', {
      answer_text: 'My answer',
      time_taken_seconds: 10,
    })
  })

  it('auto-submits with whatever text is present when the timer expires', async () => {
    vi.useFakeTimers()
    ;(submitAnswer as ReturnType<typeof vi.fn>).mockResolvedValue(feedbackResult)

    renderWithClient()
    fireEvent.change(screen.getByPlaceholderText(/type your answer/i), { target: { value: 'partial' } })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(180_000)
    })

    expect(submitAnswer).toHaveBeenCalledWith('session-1', 'q1', {
      answer_text: 'partial',
      time_taken_seconds: 180,
    })
  })

  it('auto-submits an empty answer when the timer expires with nothing typed', async () => {
    vi.useFakeTimers()
    ;(submitAnswer as ReturnType<typeof vi.fn>).mockResolvedValue(feedbackResult)

    renderWithClient()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(180_000)
    })

    expect(submitAnswer).toHaveBeenCalledWith('session-1', 'q1', { answer_text: '', time_taken_seconds: 180 })
  })

  it('does not fire a second auto-submit after a manual submit has already locked the timer', async () => {
    vi.useFakeTimers()
    ;(submitAnswer as ReturnType<typeof vi.fn>).mockImplementation(() => new Promise(() => {}))

    renderWithClient()
    fireEvent.click(screen.getByRole('button', { name: /submit answer/i }))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(180_000)
    })

    expect(submitAnswer).toHaveBeenCalledTimes(1)
  })

  it('disables the textarea once a submit attempt has been made', async () => {
    ;(submitAnswer as ReturnType<typeof vi.fn>).mockImplementation(() => new Promise(() => {}))

    renderWithClient()
    const textarea = screen.getByPlaceholderText(/type your answer/i)
    fireEvent.click(screen.getByRole('button', { name: /submit answer/i }))

    await waitFor(() => expect(textarea).toBeDisabled())
  })

  it('shows a retry action on failure and resubmits the same captured text and time', async () => {
    ;(submitAnswer as ReturnType<typeof vi.fn>)
      .mockRejectedValueOnce({ response: { status: 500 } })
      .mockResolvedValueOnce(feedbackResult)

    renderWithClient()
    fireEvent.change(screen.getByPlaceholderText(/type your answer/i), { target: { value: 'try again please' } })
    fireEvent.click(screen.getByRole('button', { name: /submit answer/i }))

    expect(await screen.findByText(/failed to submit answer/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /retry submit/i }))

    await waitFor(() => expect(submitAnswer).toHaveBeenCalledTimes(2))
    expect(submitAnswer).toHaveBeenNthCalledWith(2, 'session-1', 'q1', {
      answer_text: 'try again please',
      time_taken_seconds: 0,
    })
  })
})
