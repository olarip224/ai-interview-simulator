import { useQuery } from '@tanstack/react-query'
import { listAttempts } from '@/lib/challenges-api'
import { attemptKeys } from '@/hooks/challenges/keys'

export function useAttempts(params: { challenge_id?: string; limit?: number; offset?: number } = {}) {
  return useQuery({
    queryKey: attemptKeys.list(params),
    queryFn: () => listAttempts(params),
  })
}
