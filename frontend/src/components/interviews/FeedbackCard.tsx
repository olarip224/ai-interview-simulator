import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Feedback } from '@/types/interview'

interface FeedbackCardProps {
  feedback: Feedback
}

export function FeedbackCard({ feedback }: FeedbackCardProps) {
  const subScores = [
    { label: 'Technical', value: feedback.technical_score },
    { label: 'Communication', value: feedback.communication_score },
    { label: 'Correctness', value: feedback.correctness_score },
  ].filter((s): s is { label: string; value: number } => s.value !== null)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Feedback</span>
          <span className="text-2xl font-bold">{feedback.overall_score.toFixed(1)}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p>{feedback.feedback_text}</p>

        {subScores.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {subScores.map((s) => (
              <Badge key={s.label} variant="secondary">
                {s.label}: {s.value.toFixed(1)}
              </Badge>
            ))}
          </div>
        )}

        {feedback.strengths.length > 0 && (
          <div>
            <p className="text-sm font-medium">Strengths</p>
            <ul className="list-disc pl-5 text-sm text-muted-foreground">
              {feedback.strengths.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
        )}

        {feedback.weaknesses.length > 0 && (
          <div>
            <p className="text-sm font-medium">Weaknesses</p>
            <ul className="list-disc pl-5 text-sm text-muted-foreground">
              {feedback.weaknesses.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </div>
        )}

        {feedback.suggestions.length > 0 && (
          <div>
            <p className="text-sm font-medium">Suggestions</p>
            <ul className="list-disc pl-5 text-sm text-muted-foreground">
              {feedback.suggestions.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
