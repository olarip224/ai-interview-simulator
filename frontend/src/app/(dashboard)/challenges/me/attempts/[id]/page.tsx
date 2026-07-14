'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { CodeEditor } from '@/components/challenges/CodeEditor'
import { EvaluationResultCard } from '@/components/challenges/EvaluationResultCard'
import { DetailSkeleton } from '@/components/skeletons/DetailSkeleton'
import { useAttempt } from '@/hooks/challenges/useAttempt'
import { useChallenge } from '@/hooks/challenges/useChallenge'

export default function AttemptDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: attempt, isLoading, isError } = useAttempt(id)
  const { data: challenge } = useChallenge(attempt?.challenge_id ?? '')

  return (
    <div className="space-y-6">
      <Link href="/challenges/me/attempts" className="text-sm text-muted-foreground hover:text-foreground">
        ← Back to my attempts
      </Link>

      {isLoading && <DetailSkeleton blockHeights={['h-64', 'h-40']} />}
      {isError && <p className="text-destructive">Failed to load this attempt.</p>}

      {attempt && (
        <>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{challenge?.title ?? 'Attempt'}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {attempt.language} · Submitted {new Date(attempt.submitted_at).toLocaleString()}
              {attempt.time_taken_seconds !== null && ` · ${attempt.time_taken_seconds}s`}
            </p>
          </div>

          <CodeEditor language={attempt.language} value={attempt.code_text} readOnly />

          <EvaluationResultCard
            overall_score={attempt.overall_score}
            correctness_score={attempt.correctness_score}
            efficiency_score={attempt.efficiency_score}
            style_score={attempt.style_score}
            is_correct={attempt.is_correct}
            feedback_text={attempt.feedback_text}
            strengths={attempt.strengths}
            weaknesses={attempt.weaknesses}
            suggestions={attempt.suggestions}
          />

          {challenge && (
            <Link href={`/challenges/${challenge.id}`} className="text-sm underline">
              View challenge
            </Link>
          )}
        </>
      )}
    </div>
  )
}
