import { useQuery } from '@tanstack/react-query'
import { getProgress } from '@/lib/analytics-api'
import { analyticsKeys } from '@/hooks/analytics/keys'

export function useProgress() {
  return useQuery({
    queryKey: analyticsKeys.progress(),
    queryFn: getProgress,
  })
}
