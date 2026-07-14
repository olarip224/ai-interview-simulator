import { useQuery } from '@tanstack/react-query'
import { getAttempt } from '@/lib/challenges-api'
import { attemptKeys } from '@/hooks/challenges/keys'

export function useAttempt(id: string) {
  return useQuery({
    queryKey: attemptKeys.detail(id),
    queryFn: () => getAttempt(id),
    enabled: Boolean(id),
  })
}
