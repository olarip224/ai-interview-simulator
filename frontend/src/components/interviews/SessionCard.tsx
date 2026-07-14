import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { SessionStatusBadge } from '@/components/interviews/SessionStatusBadge'
import { INTERVIEW_TYPE_LABELS, DIFFICULTY_LABELS } from '@/components/interviews/labels'
import type { Session } from '@/types/interview'

interface SessionCardProps {
  session: Session
}

export function SessionCard({ session }: SessionCardProps) {
  const href = session.status === 'completed' ? `/interviews/${session.id}/feedback` : `/interviews/${session.id}`

  return (
    <Card>
      <CardHeader>
        <CardTitle>{INTERVIEW_TYPE_LABELS[session.interview_type]}</CardTitle>
        <CardDescription>
          {DIFFICULTY_LABELS[session.difficulty]} · {new Date(session.started_at).toLocaleDateString()}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <SessionStatusBadge status={session.status} />
          {session.overall_score !== null && (
            <span className="text-sm text-muted-foreground">Score: {session.overall_score.toFixed(1)}</span>
          )}
        </div>
        <Link href={href} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
          {session.status === 'completed' ? 'View feedback' : 'Continue'}
        </Link>
      </CardContent>
    </Card>
  )
}
