import { useQuery } from '@tanstack/react-query'
import { getResume } from '@/lib/resumes-api'
import { resumeKeys } from '@/hooks/resumes/keys'
import { getResumeRefetchInterval } from '@/hooks/resumes/polling'

export function useResume(id: string) {
  return useQuery({
    queryKey: resumeKeys.detail(id),
    queryFn: () => getResume(id),
    enabled: Boolean(id),
    refetchInterval: (query) => getResumeRefetchInterval(query.state.data),
  })
}
