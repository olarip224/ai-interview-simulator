// ─── Shared ─────────────────────────────────────────────────────────────────

export interface PageResponse<T> {
  items: T[]
  total: number
  limit: number
  offset: number
}

// ─── Enums (mirror backend app/core/enums.py) ──────────────────────────────

export type InterviewType = 'swe' | 'ml' | 'behavioral' | 'cybersecurity'
export type Difficulty = 'junior' | 'mid' | 'senior'
export type SessionStatus = 'active' | 'completed' | 'abandoned'

// ─── Request shapes ─────────────────────────────────────────────────────────

export interface CreateSessionRequest {
  interview_type: InterviewType
  difficulty: Difficulty
  resume_id?: string | null
}

export interface SubmitAnswerRequest {
  answer_text: string
  time_taken_seconds?: number | null
}

// ─── Response shapes ────────────────────────────────────────────────────────

/** Returned by GET /interviews/sessions (list item) and POST /interviews/sessions */
export interface Session {
  id: string
  interview_type: InterviewType
  difficulty: Difficulty
  status: SessionStatus
  started_at: string // ISO 8601
  completed_at: string | null
  overall_score: number | null
}

export interface Question {
  id: string
  sequence_order: number
  question_text: string
  question_type: string
  created_at: string // ISO 8601
}

/** Returned by GET /interviews/sessions/{id} */
export interface SessionDetail extends Session {
  questions: Question[]
}

export interface Feedback {
  overall_score: number
  feedback_text: string
  strengths: string[]
  weaknesses: string[]
  suggestions: string[]
  technical_score: number | null
  communication_score: number | null
  correctness_score: number | null
}

/** Returned by POST /interviews/sessions/{id}/questions/{qid}/answers */
export interface AnswerFeedback {
  answer_id: string
  feedback: Feedback
}

/** Returned by POST /interviews/sessions/{id}/complete */
export interface CompleteSessionResult {
  session_id: string
  overall_score: number
  questions_answered: number
}

export interface QuestionFeedbackItem {
  question: Question
  answer_text: string | null
  feedback: Feedback | null
}

/** Returned by GET /interviews/sessions/{id}/feedback */
export interface SessionFeedback {
  session_id: string
  overall_score: number | null
  per_question: QuestionFeedbackItem[]
  strengths: string[]
  weaknesses: string[]
}
