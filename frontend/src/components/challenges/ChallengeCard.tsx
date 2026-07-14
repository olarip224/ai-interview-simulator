import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { ChallengeDifficultyBadge } from '@/components/challenges/ChallengeDifficultyBadge'
import type { Challenge } from '@/types/challenge'

interface ChallengeCardProps {
  challenge: Challenge
}

export function ChallengeCard({ challenge }: ChallengeCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{challenge.title}</CardTitle>
        <CardDescription>
          <ChallengeDifficultyBadge difficulty={challenge.difficulty} />
        </CardDescription>
      </CardHeader>
      <CardContent className="flex items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {challenge.tags.map((tag) => (
            <Badge key={tag} variant="outline">
              {tag}
            </Badge>
          ))}
        </div>
        <Link href={`/challenges/${challenge.id}`} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
          Solve
        </Link>
      </CardContent>
    </Card>
  )
}
