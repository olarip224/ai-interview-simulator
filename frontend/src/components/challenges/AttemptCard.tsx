'use client'

import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { useChallenge } from '@/hooks/challenges/useChallenge'
import type { Attempt } from '@/types/challenge'

interface AttemptCardProps {
  attempt: Attempt
}

export function AttemptCard({ attempt }: AttemptCardProps) {
  const { data: challenge } = useChallenge(attempt.challenge_id)

  return (
    <Card>
      <CardHeader>
        <CardTitle>{challenge?.title ?? 'Loading challenge…'}</CardTitle>
        <CardDescription>
          {attempt.language} · {new Date(attempt.submitted_at).toLocaleString()}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Badge variant={attempt.is_correct ? 'default' : 'destructive'}>
            {attempt.is_correct ? 'Correct' : 'Incorrect'}
          </Badge>
          {attempt.overall_score !== null && (
            <span className="text-sm text-muted-foreground">Score: {attempt.overall_score.toFixed(1)}</span>
          )}
        </div>
        <Link
          href={`/challenges/me/attempts/${attempt.id}`}
          className={buttonVariants({ variant: 'outline', size: 'sm' })}
        >
          View
        </Link>
      </CardContent>
    </Card>
  )
}
