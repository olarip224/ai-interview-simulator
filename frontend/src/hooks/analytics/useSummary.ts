import { useQuery } from '@tanstack/react-query'
import { getSummary } from '@/lib/analytics-api'
import { analyticsKeys } from '@/hooks/analytics/keys'

export function useSummary() {
  return useQuery({
    queryKey: analyticsKeys.summary(),
    queryFn: getSummary,
  })
}
