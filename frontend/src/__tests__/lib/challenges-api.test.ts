import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

const { default: apiClient } = await import('@/lib/api')
const { listChallenges, getChallenge, submitAttempt, listAttempts, getAttempt } = await import(
  '@/lib/challenges-api'
)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('listChallenges', () => {
  it('gets /challenges with difficulty/tag/limit/offset params', async () => {
    ;(apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { items: [], total: 0, limit: 12, offset: 0 },
    })

    await listChallenges({ difficulty: 'easy', tag: 'arrays', limit: 12, offset: 0 })

    expect(apiClient.get).toHaveBeenCalledWith('/challenges', {
      params: { difficulty: 'easy', tag: 'arrays', limit: 12, offset: 0 },
    })
  })
})

describe('getChallenge', () => {
  it('gets /challenges/{id}', async () => {
    ;(apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { id: 'abc' } })

    const result = await getChallenge('abc')

    expect(apiClient.get).toHaveBeenCalledWith('/challenges/abc')
    expect(result).toEqual({ id: 'abc' })
  })
})

describe('submitAttempt', () => {
  it('posts to /challenges/{id}/attempts with the submission body', async () => {
    const response = {
      attempt_id: 'att-1',
      feedback: {
        overall_score: 8,
        correctness_score: null,
        efficiency_score: null,
        style_score: null,
        is_correct: true,
        feedback_text: 'ok',
        strengths: [],
        weaknesses: [],
        suggestions: [],
      },
    }
    ;(apiClient.post as ReturnType<typeof vi.fn>).mockResolvedValue({ data: response })

    const result = await submitAttempt('ch-1', { language: 'python', code_text: 'print(1)', time_taken_seconds: 20 })

    expect(apiClient.post).toHaveBeenCalledWith('/challenges/ch-1/attempts', {
      language: 'python',
      code_text: 'print(1)',
      time_taken_seconds: 20,
    })
    expect(result).toEqual(response)
  })
})

describe('listAttempts', () => {
  it('gets /challenges/me/attempts with params', async () => {
    ;(apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { items: [], total: 0, limit: 12, offset: 0 },
    })

    await listAttempts({ challenge_id: 'ch-1', limit: 12, offset: 0 })

    expect(apiClient.get).toHaveBeenCalledWith('/challenges/me/attempts', {
      params: { challenge_id: 'ch-1', limit: 12, offset: 0 },
    })
  })
})

describe('getAttempt', () => {
  it('gets /challenges/me/attempts/{id}', async () => {
    ;(apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { id: 'att-1' } })

    const result = await getAttempt('att-1')

    expect(apiClient.get).toHaveBeenCalledWith('/challenges/me/attempts/att-1')
    expect(result).toEqual({ id: 'att-1' })
  })
})
