import type { Feedback, Question, QuestionFeedbackItem } from '@/types/interview'

export type RoomState =
  | { kind: 'no-questions' }
  | { kind: 'awaiting-answer'; question: Question }
  | { kind: 'feedback-shown'; question: Question; answerText: string; feedback: Feedback }

export function getCurrentQuestionState(perQuestion: QuestionFeedbackItem[]): RoomState {
  if (perQuestion.length === 0) return { kind: 'no-questions' }

  const last = perQuestion[perQuestion.length - 1]
  if (last.answer_text == null || last.feedback == null) {
    return { kind: 'awaiting-answer', question: last.question }
  }

  return { kind: 'feedback-shown', question: last.question, answerText: last.answer_text, feedback: last.feedback }
}
