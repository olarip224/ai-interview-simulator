import { useQuery } from '@tanstack/react-query'
import { getWeakTopics } from '@/lib/analytics-api'
import { analyticsKeys } from '@/hooks/analytics/keys'

export function useWeakTopics() {
  return useQuery({
    queryKey: analyticsKeys.weakTopics(),
    queryFn: getWeakTopics,
  })
}
