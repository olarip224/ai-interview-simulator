import { useQuery } from '@tanstack/react-query'
import { getSessionFeedback } from '@/lib/interviews-api'
import { sessionKeys } from '@/hooks/interviews/keys'

export function useSessionFeedback(id: string) {
  return useQuery({
    queryKey: sessionKeys.feedback(id),
    queryFn: () => getSessionFeedback(id),
    enabled: Boolean(id),
  })
}
