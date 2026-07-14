import { useQuery } from '@tanstack/react-query'
import { getSession } from '@/lib/interviews-api'
import { sessionKeys } from '@/hooks/interviews/keys'

export function useSession(id: string) {
  return useQuery({
    queryKey: sessionKeys.detail(id),
    queryFn: () => getSession(id),
    enabled: Boolean(id),
  })
}
