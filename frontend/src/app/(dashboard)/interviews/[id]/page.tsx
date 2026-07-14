'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { SessionStatusBadge } from '@/components/interviews/SessionStatusBadge'
import { QuestionCard } from '@/components/interviews/QuestionCard'
import { AnswerForm } from '@/components/interviews/AnswerForm'
import { FeedbackCard } from '@/components/interviews/FeedbackCard'
import { EndInterviewDialog } from '@/components/interviews/EndInterviewDialog'
import { INTERVIEW_TYPE_LABELS, DIFFICULTY_LABELS } from '@/components/interviews/labels'
import { getCurrentQuestionState } from '@/components/interviews/room-state'
import { DetailSkeleton } from '@/components/skeletons/DetailSkeleton'
import { useSession } from '@/hooks/interviews/useSession'
import { useSessionFeedback } from '@/hooks/interviews/useSessionFeedback'
import { useGenerateQuestion } from '@/hooks/interviews/useGenerateQuestion'
import { useCompleteSession } from '@/hooks/interviews/useCompleteSession'

export default function InterviewRoomPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const { data: session, isLoading: isSessionLoading, isError: isSessionError } = useSession(id)
  const { data: feedbackDetail, isLoading: isFeedbackLoading, isError: isFeedbackError } = useSessionFeedback(id)
  const generateMutation = useGenerateQuestion()
  const completeMutation = useCompleteSession()

  useEffect(() => {
    if (session && session.status !== 'active') {
      router.replace(`/interviews/${id}/feedback`)
    }
  }, [session, id, router])

  const handleGenerateQuestion = () => {
    generateMutation.mutate(id, {
      onError: () => toast.error('Failed to generate question'),
    })
  }

  const handleComplete = () => {
    completeMutation.mutate(id, {
      onSuccess: () => router.push(`/interviews/${id}/feedback`),
      onError: () => toast.error('Failed to end interview'),
    })
  }

  const isLoading = isSessionLoading || isFeedbackLoading
  const isError = isSessionError || isFeedbackError
  const isMutating = generateMutation.isPending || completeMutation.isPending
  const roomState = feedbackDetail ? getCurrentQuestionState(feedbackDetail.per_question) : null

  return (
    <div className="space-y-6">
      <Link href="/interviews" className="text-sm text-muted-foreground hover:text-foreground">
        ← Back to sessions
      </Link>

      {isLoading && <DetailSkeleton blockHeights={['h-24', 'h-64']} />}
      {isError && <p className="text-destructive">Failed to load this interview session.</p>}

      {session && roomState && session.status === 'active' && (
        <>
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold tracking-tight">
              {INTERVIEW_TYPE_LABELS[session.interview_type]} · {DIFFICULTY_LABELS[session.difficulty]}
            </h1>
            <div className="flex items-center gap-3">
              <SessionStatusBadge status={session.status} />
              <EndInterviewDialog
                onConfirm={handleComplete}
                hasUnansweredQuestion={roomState.kind === 'awaiting-answer'}
                trigger={
                  <Button variant="outline" size="sm" disabled={isMutating}>
                    End interview
                  </Button>
                }
              />
            </div>
          </div>

          {roomState.kind === 'no-questions' && (
            <div className="space-y-4">
              <p className="text-muted-foreground">No questions yet — generate the first one to begin.</p>
              <Button onClick={handleGenerateQuestion} disabled={isMutating}>
                {generateMutation.isPending ? 'Generating…' : 'Generate first question'}
              </Button>
            </div>
          )}

          {roomState.kind === 'awaiting-answer' && (
            <div className="space-y-4">
              <QuestionCard question={roomState.question} />
              <AnswerForm key={roomState.question.id} sessionId={id} question={roomState.question} />
            </div>
          )}

          {roomState.kind === 'feedback-shown' && (
            <div className="space-y-4">
              <QuestionCard question={roomState.question} />
              <p className="text-sm text-muted-foreground">Your answer: {roomState.answerText}</p>
              <FeedbackCard feedback={roomState.feedback} />
              <Button onClick={handleGenerateQuestion} disabled={isMutating}>
                {generateMutation.isPending ? 'Generating…' : 'Next question'}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
