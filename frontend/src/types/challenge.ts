// ─── Shared ─────────────────────────────────────────────────────────────────

export interface PageResponse<T> {
  items: T[]
  total: number
  limit: number
  offset: number
}

// ─── Enums (mirror backend app/core/enums.py) ──────────────────────────────

export type ChallengeDifficulty = 'easy' | 'medium' | 'hard'

// ─── Request shapes ─────────────────────────────────────────────────────────

export interface SubmitCodeRequest {
  language: string
  code_text: string
  time_taken_seconds?: number | null
}

// ─── Response shapes ────────────────────────────────────────────────────────

/** Returned by GET /challenges (list item) — no description/examples/starter_code */
export interface Challenge {
  id: string
  title: string
  difficulty: ChallengeDifficulty
  tags: string[]
  created_at: string // ISO 8601
}

export interface ChallengeExample {
  input: string
  output: string
  explanation?: string
}

/** Returned by GET /challenges/{id} */
export interface ChallengeDetail {
  id: string
  title: string
  description: string
  difficulty: ChallengeDifficulty
  tags: string[]
  examples: ChallengeExample[]
  constraints: string[]
  starter_code: Record<string, string>
  created_at: string // ISO 8601
}

export interface AttemptFeedback {
  overall_score: number | null
  correctness_score: number | null
  efficiency_score: number | null
  style_score: number | null
  is_correct: boolean
  feedback_text: string
  strengths: string[]
  weaknesses: string[]
  suggestions: string[]
}

/** Returned by POST /challenges/{id}/attempts */
export interface SubmitAttemptResult {
  attempt_id: string
  feedback: AttemptFeedback
}

/** Returned by GET /challenges/me/attempts (list item) — no code_text, no per-metric scores/text */
export interface Attempt {
  id: string
  challenge_id: string
  language: string
  overall_score: number | null
  is_correct: boolean
  submitted_at: string // ISO 8601
}

/** Returned by GET /challenges/me/attempts/{id} — feedback fields flattened, not nested */
export interface AttemptDetail {
  id: string
  challenge_id: string
  language: string
  code_text: string
  overall_score: number | null
  correctness_score: number | null
  efficiency_score: number | null
  style_score: number | null
  is_correct: boolean
  feedback_text: string | null
  strengths: string[]
  weaknesses: string[]
  suggestions: string[]
  time_taken_seconds: number | null
  submitted_at: string // ISO 8601
}
