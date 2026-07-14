'use client'

import { useRef, useState } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AnswerTimer } from '@/components/interviews/AnswerTimer'
import { useCountdown } from '@/hooks/interviews/useCountdown'
import { DEFAULT_QUESTION_TIME_LIMIT_SECONDS } from '@/hooks/interviews/countdown'
import { useSubmitAnswer } from '@/hooks/interviews/useSubmitAnswer'
import { getSubmitErrorMessage } from '@/components/interviews/submit-helpers'
import type { Question } from '@/types/interview'

interface AnswerFormProps {
  sessionId: string
  question: Question
}

/**
 * Mount this keyed on question.id (`<AnswerForm key={question.id} .../>`) so
 * switching to a new question remounts it — that's what resets the textarea
 * and countdown, instead of manual reset plumbing.
 */
export function AnswerForm({ sessionId, question }: AnswerFormProps) {
  const [answerText, setAnswerText] = useState('')
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false)
  const [capturedTimeTaken, setCapturedTimeTaken] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const answerTextRef = useRef(answerText)
  answerTextRef.current = answerText

  const submitMutation = useSubmitAnswer()

  const doSubmit = (timeTakenSeconds: number) => {
    setHasAttemptedSubmit(true)
    setCapturedTimeTaken(timeTakenSeconds)
    setError(null)
    submitMutation.mutate(
      {
        sessionId,
        questionId: question.id,
        data: { answer_text: answerTextRef.current, time_taken_seconds: timeTakenSeconds },
      },
      { onError: (err) => setError(getSubmitErrorMessage(err)) }
    )
  }

  const { secondsRemaining } = useCountdown({
    durationSeconds: DEFAULT_QUESTION_TIME_LIMIT_SECONDS,
    isPaused: hasAttemptedSubmit,
    onExpire: () => doSubmit(DEFAULT_QUESTION_TIME_LIMIT_SECONDS),
  })

  const handleManualSubmit = () => {
    if (hasAttemptedSubmit) return
    doSubmit(DEFAULT_QUESTION_TIME_LIMIT_SECONDS - secondsRemaining)
  }

  const handleRetry = () => {
    if (capturedTimeTaken === null) return
    setError(null)
    submitMutation.mutate(
      {
        sessionId,
        questionId: question.id,
        data: { answer_text: answerTextRef.current, time_taken_seconds: capturedTimeTaken },
      },
      { onError: (err) => setError(getSubmitErrorMessage(err)) }
    )
  }

  return (
    <div className="space-y-3">
      <AnswerTimer secondsRemaining={secondsRemaining} durationSeconds={DEFAULT_QUESTION_TIME_LIMIT_SECONDS} />

      <Textarea
        placeholder="Type your answer…"
        value={answerText}
        onChange={(e) => setAnswerText(e.target.value)}
        disabled={hasAttemptedSubmit}
        rows={8}
      />

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Submission failed</AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-4">
            <span>{error}</span>
            <Button size="sm" variant="outline" onClick={handleRetry} disabled={submitMutation.isPending}>
              Retry submit
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {!hasAttemptedSubmit && (
        <Button onClick={handleManualSubmit}>Submit answer</Button>
      )}

      {hasAttemptedSubmit && !error && (
        <Button disabled>{submitMutation.isPending ? 'Submitting…' : 'Submitted'}</Button>
      )}
    </div>
  )
}
