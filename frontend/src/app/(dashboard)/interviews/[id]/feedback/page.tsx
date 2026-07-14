'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { SessionStatusBadge } from '@/components/interviews/SessionStatusBadge'
import { QuestionCard } from '@/components/interviews/QuestionCard'
import { FeedbackCard } from '@/components/interviews/FeedbackCard'
import { INTERVIEW_TYPE_LABELS, DIFFICULTY_LABELS } from '@/components/interviews/labels'
import { DetailSkeleton } from '@/components/skeletons/DetailSkeleton'
import { useSession } from '@/hooks/interviews/useSession'
import { useSessionFeedback } from '@/hooks/interviews/useSessionFeedback'

export default function InterviewFeedbackPage() {
  const { id } = useParams<{ id: string }>()
  const { data: session, isLoading: isSessionLoading, isError: isSessionError } = useSession(id)
  const { data: feedbackDetail, isLoading: isFeedbackLoading, isError: isFeedbackError } = useSessionFeedback(id)

  const isLoading = isSessionLoading || isFeedbackLoading
  const isError = isSessionError || isFeedbackError

  return (
    <div className="space-y-6">
      <Link href="/interviews" className="text-sm text-muted-foreground hover:text-foreground">
        ← Back to sessions
      </Link>

      {isLoading && <DetailSkeleton blockHeights={['h-24', 'h-48', 'h-48']} />}
      {isError && <p className="text-destructive">Failed to load this session&apos;s feedback.</p>}

      {session && feedbackDetail && (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                {INTERVIEW_TYPE_LABELS[session.interview_type]} · {DIFFICULTY_LABELS[session.difficulty]}
              </h1>
              {session.status !== 'completed' && (
                <p className="mt-1 text-sm text-muted-foreground">
                  This interview is still in progress —{' '}
                  <Link href={`/interviews/${id}`} className="underline">
                    return to the interview room
                  </Link>
                  .
                </p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <SessionStatusBadge status={session.status} />
              {feedbackDetail.overall_score !== null && (
                <span className="text-2xl font-bold">{feedbackDetail.overall_score.toFixed(1)}</span>
              )}
            </div>
          </div>

          {(feedbackDetail.strengths.length > 0 || feedbackDetail.weaknesses.length > 0) && (
            <Card>
              <CardHeader>
                <CardTitle>Overall</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {feedbackDetail.strengths.length > 0 && (
                  <div>
                    <p className="text-sm font-medium">Strengths</p>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {feedbackDetail.strengths.map((s) => (
                        <Badge key={s} variant="secondary">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {feedbackDetail.weaknesses.length > 0 && (
                  <div>
                    <p className="text-sm font-medium">Weaknesses</p>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {feedbackDetail.weaknesses.map((w) => (
                        <Badge key={w} variant="outline">
                          {w}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {feedbackDetail.per_question.length === 0 && (
            <p className="text-muted-foreground">No questions were answered in this session.</p>
          )}

          <div className="space-y-6">
            {feedbackDetail.per_question.map((item) => (
              <div key={item.question.id} className="space-y-3">
                <QuestionCard question={item.question} />
                {item.answer_text !== null ? (
                  <>
                    <p className="text-sm text-muted-foreground">Your answer: {item.answer_text}</p>
                    {item.feedback && <FeedbackCard feedback={item.feedback} />}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Not answered.</p>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
