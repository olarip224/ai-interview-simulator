import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createSession } from '@/lib/interviews-api'
import { sessionKeys } from '@/hooks/interviews/keys'

export function useCreateSession() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.lists() })
    },
  })
}
