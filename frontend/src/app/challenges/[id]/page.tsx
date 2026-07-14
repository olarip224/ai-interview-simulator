'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import TopNav from '@/components/nav/TopNav'
import Sidebar from '@/components/nav/Sidebar'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card, CardContent } from '@/components/ui/card'
import { ChallengeDifficultyBadge } from '@/components/challenges/ChallengeDifficultyBadge'
import { LanguageTabs } from '@/components/challenges/LanguageTabs'
import { CodeEditor } from '@/components/challenges/CodeEditor'
import { EvaluationResultCard } from '@/components/challenges/EvaluationResultCard'
import { getStarterCodeForLanguage } from '@/components/challenges/starter-code'
import { getSubmitErrorMessage } from '@/components/challenges/submit-helpers'
import { EDITOR_LANGUAGES, type EditorLanguage } from '@/components/challenges/labels'
import { useChallenge } from '@/hooks/challenges/useChallenge'
import { useSubmitAttempt } from '@/hooks/challenges/useSubmitAttempt'
import type { SubmitAttemptResult } from '@/types/challenge'

export default function ChallengeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: challenge, isLoading, isError } = useChallenge(id)
  const submitMutation = useSubmitAttempt()

  const [language, setLanguage] = useState<EditorLanguage>(EDITOR_LANGUAGES[0])
  const [codeByLanguage, setCodeByLanguage] = useState<Partial<Record<EditorLanguage, string>>>({})
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<SubmitAttemptResult | null>(null)
  const [startedAt] = useState(() => Date.now())

  const getCode = (lang: EditorLanguage): string => {
    if (codeByLanguage[lang] !== undefined) return codeByLanguage[lang] as string
    return challenge ? getStarterCodeForLanguage(challenge.starter_code, lang) : ''
  }

  const handleCodeChange = (value: string) => {
    setCodeByLanguage((prev) => ({ ...prev, [language]: value }))
  }

  const handleSubmit = () => {
    setError(null)
    const timeTakenSeconds = Math.round((Date.now() - startedAt) / 1000)
    submitMutation.mutate(
      { challengeId: id, data: { language, code_text: getCode(language), time_taken_seconds: timeTakenSeconds } },
      {
        onSuccess: (data) => setResult(data),
        onError: (err) => setError(getSubmitErrorMessage(err)),
      }
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <TopNav />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 space-y-6 p-8">
          <Link href="/challenges" className="text-sm text-muted-foreground hover:text-foreground">
            ← Back to challenges
          </Link>

          {isLoading && <p className="text-muted-foreground">Loading challenge…</p>}
          {isError && <p className="text-destructive">Failed to load this challenge.</p>}

          {challenge && (
            <>
              <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">{challenge.title}</h1>
                <ChallengeDifficultyBadge difficulty={challenge.difficulty} />
              </div>

              <Card>
                <CardContent className="space-y-4 pt-6">
                  <p>{challenge.description}</p>

                  {challenge.examples.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Examples</p>
                      {challenge.examples.map((example, i) => (
                        <div key={i} className="rounded-md bg-muted p-3 text-sm">
                          <p>
                            <span className="font-medium">Input:</span> {example.input}
                          </p>
                          <p>
                            <span className="font-medium">Output:</span> {example.output}
                          </p>
                          {example.explanation && <p className="text-muted-foreground">{example.explanation}</p>}
                        </div>
                      ))}
                    </div>
                  )}

                  {challenge.constraints.length > 0 && (
                    <div>
                      <p className="text-sm font-medium">Constraints</p>
                      <ul className="list-disc pl-5 text-sm text-muted-foreground">
                        {challenge.constraints.map((c, i) => (
                          <li key={i}>{c}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="space-y-3">
                <LanguageTabs value={language} onValueChange={setLanguage} />
                <CodeEditor language={language} value={getCode(language)} onChange={handleCodeChange} />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertTitle>Submission failed</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button onClick={handleSubmit} disabled={submitMutation.isPending}>
                {submitMutation.isPending ? 'Submitting…' : 'Submit solution'}
              </Button>

              {result && (
                <EvaluationResultCard
                  overall_score={result.feedback.overall_score}
                  correctness_score={result.feedback.correctness_score}
                  efficiency_score={result.feedback.efficiency_score}
                  style_score={result.feedback.style_score}
                  is_correct={result.feedback.is_correct}
                  feedback_text={result.feedback.feedback_text}
                  strengths={result.feedback.strengths}
                  weaknesses={result.feedback.weaknesses}
                  suggestions={result.feedback.suggestions}
                />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  )
}
