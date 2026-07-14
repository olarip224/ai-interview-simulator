import { describe, it, expect } from 'vitest'
import { getCurrentQuestionState } from '@/components/interviews/room-state'
import type { QuestionFeedbackItem } from '@/types/interview'

const question = (overrides: Partial<QuestionFeedbackItem['question']> = {}): QuestionFeedbackItem['question'] => ({
  id: 'q1',
  sequence_order: 1,
  question_text: 'Tell me about yourself.',
  question_type: 'behavioral',
  created_at: '2026-01-01T00:00:00Z',
  ...overrides,
})

const feedback = (): NonNullable<QuestionFeedbackItem['feedback']> => ({
  overall_score: 8,
  feedback_text: 'Great answer.',
  strengths: ['Clear communication'],
  weaknesses: [],
  suggestions: [],
  technical_score: null,
  communication_score: 8,
  correctness_score: null,
})

describe('getCurrentQuestionState', () => {
  it('returns no-questions for an empty list', () => {
    expect(getCurrentQuestionState([])).toEqual({ kind: 'no-questions' })
  })

  it('returns awaiting-answer when the last question has no answer yet', () => {
    const items: QuestionFeedbackItem[] = [{ question: question(), answer_text: null, feedback: null }]
    expect(getCurrentQuestionState(items)).toEqual({ kind: 'awaiting-answer', question: items[0].question })
  })

  it('returns feedback-shown when the last question has been answered', () => {
    const items: QuestionFeedbackItem[] = [
      { question: question(), answer_text: 'My answer.', feedback: feedback() },
    ]
    expect(getCurrentQuestionState(items)).toEqual({
      kind: 'feedback-shown',
      question: items[0].question,
      answerText: 'My answer.',
      feedback: items[0].feedback,
    })
  })

  it('derives state from only the last item when there is history', () => {
    const items: QuestionFeedbackItem[] = [
      { question: question({ id: 'q1', sequence_order: 1 }), answer_text: 'First answer.', feedback: feedback() },
      { question: question({ id: 'q2', sequence_order: 2 }), answer_text: null, feedback: null },
    ]
    expect(getCurrentQuestionState(items)).toEqual({ kind: 'awaiting-answer', question: items[1].question })
  })

  it('treats a non-null answer_text with a null feedback as still awaiting (defensive)', () => {
    const items: QuestionFeedbackItem[] = [{ question: question(), answer_text: 'answered', feedback: null }]
    expect(getCurrentQuestionState(items).kind).toBe('awaiting-answer')
  })
})
