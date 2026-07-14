import { useMutation, useQueryClient } from '@tanstack/react-query'
import { submitAnswer } from '@/lib/interviews-api'
import { sessionKeys } from '@/hooks/interviews/keys'
import type { SubmitAnswerRequest } from '@/types/interview'

interface SubmitAnswerVariables {
  sessionId: string
  questionId: string
  data: SubmitAnswerRequest
}

export function useSubmitAnswer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ sessionId, questionId, data }: SubmitAnswerVariables) => submitAnswer(sessionId, questionId, data),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.feedback(variables.sessionId) })
    },
  })
}
