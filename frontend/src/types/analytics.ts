import type { InterviewType } from '@/types/interview'

export interface TypeBreakdownItem {
  interview_type: InterviewType
  sessions: number
  avg_score: number
}

/** Returned by GET /analytics/me/summary */
export interface UserSummary {
  total_sessions: number
  avg_overall_score: number | null
  avg_technical_score: number | null
  avg_communication_score: number | null
  avg_correctness_score: number | null
  top_weak_topics: string[]
  by_interview_type: TypeBreakdownItem[]
}

/** Returned by GET /analytics/me/progress (list item) */
export interface ProgressItem {
  session_id: string
  interview_type: InterviewType
  overall_score: number
  completed_at: string // ISO 8601
}

/** Returned by GET /analytics/me/weak-topics (list item) */
export interface WeakTopicItem {
  topic: string
  count: number
}
