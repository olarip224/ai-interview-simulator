import { useQuery } from '@tanstack/react-query'
import { getChallenge } from '@/lib/challenges-api'
import { challengeKeys } from '@/hooks/challenges/keys'

export function useChallenge(id: string) {
  return useQuery({
    queryKey: challengeKeys.detail(id),
    queryFn: () => getChallenge(id),
    enabled: Boolean(id),
  })
}
