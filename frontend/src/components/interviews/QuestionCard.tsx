import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Question } from '@/types/interview'

interface QuestionCardProps {
  question: Question
}

export function QuestionCard({ question }: QuestionCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Question {question.sequence_order}</CardTitle>
      </CardHeader>
      <CardContent>
        <p>{question.question_text}</p>
      </CardContent>
    </Card>
  )
}
