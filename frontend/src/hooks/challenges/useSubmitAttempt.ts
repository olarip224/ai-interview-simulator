import { useMutation, useQueryClient } from '@tanstack/react-query'
import { submitAttempt } from '@/lib/challenges-api'
import { attemptKeys } from '@/hooks/challenges/keys'
import type { SubmitCodeRequest } from '@/types/challenge'

interface SubmitAttemptVariables {
  challengeId: string
  data: SubmitCodeRequest
}

export function useSubmitAttempt() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ challengeId, data }: SubmitAttemptVariables) => submitAttempt(challengeId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: attemptKeys.lists() })
    },
  })
}
