import { useMutation, useQueryClient } from '@tanstack/react-query'
import { generateQuestion } from '@/lib/interviews-api'
import { sessionKeys } from '@/hooks/interviews/keys'

export function useGenerateQuestion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (sessionId: string) => generateQuestion(sessionId),
    onSuccess: (_question, sessionId) => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.feedback(sessionId) })
      queryClient.invalidateQueries({ queryKey: sessionKeys.detail(sessionId) })
    },
  })
}
