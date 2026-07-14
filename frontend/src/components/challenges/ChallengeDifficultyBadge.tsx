import { Badge } from '@/components/ui/badge'
import { CHALLENGE_DIFFICULTY_LABELS } from '@/components/challenges/labels'
import type { ChallengeDifficulty } from '@/types/challenge'

interface ChallengeDifficultyBadgeProps {
  difficulty: ChallengeDifficulty
}

export function ChallengeDifficultyBadge({ difficulty }: ChallengeDifficultyBadgeProps) {
  switch (difficulty) {
    case 'easy':
      return <Badge variant="secondary">{CHALLENGE_DIFFICULTY_LABELS.easy}</Badge>
    case 'medium':
      return <Badge variant="default">{CHALLENGE_DIFFICULTY_LABELS.medium}</Badge>
    case 'hard':
      return <Badge variant="destructive">{CHALLENGE_DIFFICULTY_LABELS.hard}</Badge>
  }
}
