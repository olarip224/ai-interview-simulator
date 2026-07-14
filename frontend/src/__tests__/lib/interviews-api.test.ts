import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

const { default: apiClient } = await import('@/lib/api')
const {
  createSession,
  listSessions,
  getSession,
  generateQuestion,
  submitAnswer,
  completeSession,
  getSessionFeedback,
} = await import('@/lib/interviews-api')

beforeEach(() => {
  vi.clearAllMocks()
})

describe('createSession', () => {
  it('posts to /interviews/sessions with the request body', async () => {
    const session = {
      id: '1',
      interview_type: 'swe',
      difficulty: 'mid',
      status: 'active',
      started_at: '2026-01-01T00:00:00Z',
      completed_at: null,
      overall_score: null,
    }
    ;(apiClient.post as ReturnType<typeof vi.fn>).mockResolvedValue({ data: session })

    const result = await createSession({ interview_type: 'swe', difficulty: 'mid', resume_id: null })

    expect(apiClient.post).toHaveBeenCalledWith('/interviews/sessions', {
      interview_type: 'swe',
      difficulty: 'mid',
      resume_id: null,
    })
    expect(result).toEqual(session)
  })
})

describe('listSessions', () => {
  it('gets /interviews/sessions with limit/offset/status params', async () => {
    ;(apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { items: [], total: 0, limit: 12, offset: 0 },
    })

    await listSessions({ limit: 12, offset: 0, status: 'active' })

    expect(apiClient.get).toHaveBeenCalledWith('/interviews/sessions', {
      params: { limit: 12, offset: 0, status: 'active' },
    })
  })
})

describe('getSession', () => {
  it('gets /interviews/sessions/{id}', async () => {
    ;(apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { id: 'abc', questions: [] },
    })

    const result = await getSession('abc')

    expect(apiClient.get).toHaveBeenCalledWith('/interviews/sessions/abc')
    expect(result.id).toBe('abc')
  })
})

describe('generateQuestion', () => {
  it('posts to /interviews/sessions/{id}/questions with no body', async () => {
    const question = {
      id: 'q1',
      sequence_order: 1,
      question_text: 'Tell me about yourself.',
      question_type: 'behavioral',
      created_at: '2026-01-01T00:00:00Z',
    }
    ;(apiClient.post as ReturnType<typeof vi.fn>).mockResolvedValue({ data: question })

    const result = await generateQuestion('session-1')

    expect(apiClient.post).toHaveBeenCalledWith('/interviews/sessions/session-1/questions')
    expect(result).toEqual(question)
  })
})

describe('submitAnswer', () => {
  it('posts to /interviews/sessions/{id}/questions/{qid}/answers with the answer body', async () => {
    const response = {
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
    ;(apiClient.post as ReturnType<typeof vi.fn>).mockResolvedValue({ data: response })

    const result = await submitAnswer('session-1', 'q1', { answer_text: 'My answer', time_taken_seconds: 30 })

    expect(apiClient.post).toHaveBeenCalledWith('/interviews/sessions/session-1/questions/q1/answers', {
      answer_text: 'My answer',
      time_taken_seconds: 30,
    })
    expect(result).toEqual(response)
  })
})

describe('completeSession', () => {
  it('posts to /interviews/sessions/{id}/complete', async () => {
    const response = { session_id: 'session-1', overall_score: 8, questions_answered: 2 }
    ;(apiClient.post as ReturnType<typeof vi.fn>).mockResolvedValue({ data: response })

    const result = await completeSession('session-1')

    expect(apiClient.post).toHaveBeenCalledWith('/interviews/sessions/session-1/complete')
    expect(result).toEqual(response)
  })
})

describe('getSessionFeedback', () => {
  it('gets /interviews/sessions/{id}/feedback', async () => {
    const response = { session_id: 'session-1', overall_score: 8, per_question: [], strengths: [], weaknesses: [] }
    ;(apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValue({ data: response })

    const result = await getSessionFeedback('session-1')

    expect(apiClient.get).toHaveBeenCalledWith('/interviews/sessions/session-1/feedback')
    expect(result).toEqual(response)
  })
})
