import { useQuery } from '@tanstack/react-query'
import { listChallenges } from '@/lib/challenges-api'
import { challengeKeys } from '@/hooks/challenges/keys'

export function useChallenges(
  params: { difficulty?: string; tag?: string; limit?: number; offset?: number } = {}
) {
  return useQuery({
    queryKey: challengeKeys.list(params),
    queryFn: () => listChallenges(params),
  })
}
