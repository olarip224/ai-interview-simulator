import { INTERVIEW_TYPE_LABELS } from '@/components/interviews/labels'
import type { InterviewType } from '@/types/interview'
import type { ProgressItem } from '@/types/analytics'

const CANONICAL_INTERVIEW_TYPES = Object.keys(INTERVIEW_TYPE_LABELS) as InterviewType[]

export function sortProgressAscending(items: ProgressItem[]): ProgressItem[] {
  return [...items].sort((a, b) => new Date(a.completed_at).getTime() - new Date(b.completed_at).getTime())
}

/** Canonical order, filtered down to only the types actually present in the data. */
export function getPresentInterviewTypes(items: ProgressItem[]): InterviewType[] {
  const present = new Set(items.map((item) => item.interview_type))
  return CANONICAL_INTERVIEW_TYPES.filter((type) => present.has(type))
}

export interface ChartRow {
  completed_at: string
  [interviewType: string]: string | number | undefined
}

/**
 * One row per session. Only the row's own interview_type key is set — the
 * other type keys stay undefined so Recharts draws a gap for that series
 * rather than a misleading zero.
 */
export function toChartRows(items: ProgressItem[]): ChartRow[] {
  return items.map((item) => ({
    completed_at: item.completed_at,
    [item.interview_type]: item.overall_score,
  }))
}
