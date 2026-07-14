import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface EvaluationResultCardProps {
  overall_score: number | null
  correctness_score: number | null
  efficiency_score: number | null
  style_score: number | null
  is_correct: boolean
  feedback_text: string | null
  strengths: string[]
  weaknesses: string[]
  suggestions: string[]
}

export function EvaluationResultCard(props: EvaluationResultCardProps) {
  const subScores = [
    { label: 'Correctness', value: props.correctness_score },
    { label: 'Efficiency', value: props.efficiency_score },
    { label: 'Style', value: props.style_score },
  ].filter((s): s is { label: string; value: number } => s.value !== null)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            Evaluation
            <Badge variant={props.is_correct ? 'default' : 'destructive'}>
              {props.is_correct ? 'Correct' : 'Incorrect'}
            </Badge>
          </span>
          {props.overall_score !== null && <span className="text-2xl font-bold">{props.overall_score.toFixed(1)}</span>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {props.feedback_text && <p>{props.feedback_text}</p>}

        {subScores.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {subScores.map((s) => (
              <Badge key={s.label} variant="secondary">
                {s.label}: {s.value.toFixed(1)}
              </Badge>
            ))}
          </div>
        )}

        {props.strengths.length > 0 && (
          <div>
            <p className="text-sm font-medium">Strengths</p>
            <ul className="list-disc pl-5 text-sm text-muted-foreground">
              {props.strengths.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
        )}

        {props.weaknesses.length > 0 && (
          <div>
            <p className="text-sm font-medium">Weaknesses</p>
            <ul className="list-disc pl-5 text-sm text-muted-foreground">
              {props.weaknesses.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </div>
        )}

        {props.suggestions.length > 0 && (
          <div>
            <p className="text-sm font-medium">Suggestions</p>
            <ul className="list-disc pl-5 text-sm text-muted-foreground">
              {props.suggestions.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
