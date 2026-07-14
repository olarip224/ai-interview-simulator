import { useQuery } from '@tanstack/react-query'
import { listSessions } from '@/lib/interviews-api'
import { sessionKeys } from '@/hooks/interviews/keys'

export function useSessions(params: { limit?: number; offset?: number; status?: string } = {}) {
  return useQuery({
    queryKey: sessionKeys.list(params),
    queryFn: () => listSessions(params),
  })
}
