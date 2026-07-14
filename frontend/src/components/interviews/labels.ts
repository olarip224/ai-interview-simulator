import type { Difficulty, InterviewType } from '@/types/interview'

export const INTERVIEW_TYPE_LABELS: Record<InterviewType, string> = {
  swe: 'Software Engineering',
  ml: 'Machine Learning',
  behavioral: 'Behavioral',
  cybersecurity: 'Cybersecurity',
}

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  junior: 'Junior',
  mid: 'Mid',
  senior: 'Senior',
}
