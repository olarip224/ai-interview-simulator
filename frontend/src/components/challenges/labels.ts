import type { ChallengeDifficulty } from '@/types/challenge'

export const CHALLENGE_DIFFICULTY_LABELS: Record<ChallengeDifficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
}

export const EDITOR_LANGUAGES = ['python', 'javascript', 'typescript', 'go'] as const
export type EditorLanguage = (typeof EDITOR_LANGUAGES)[number]

export const EDITOR_LANGUAGE_LABELS: Record<EditorLanguage, string> = {
  python: 'Python',
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  go: 'Go',
}
