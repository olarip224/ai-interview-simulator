import { useMutation, useQueryClient } from '@tanstack/react-query'
import { completeSession } from '@/lib/interviews-api'
import { sessionKeys } from '@/hooks/interviews/keys'

export function useCompleteSession() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (sessionId: string) => completeSession(sessionId),
    onSuccess: (_result, sessionId) => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.detail(sessionId) })
      queryClient.invalidateQueries({ queryKey: sessionKeys.feedback(sessionId) })
      queryClient.invalidateQueries({ queryKey: sessionKeys.lists() })
    },
  })
}
