import { useQuery } from '@tanstack/react-query'
import { listResumes } from '@/lib/resumes-api'
import { resumeKeys } from '@/hooks/resumes/keys'
import { getResumesRefetchInterval } from '@/hooks/resumes/polling'

export function useResumes(params: { limit?: number; offset?: number } = {}) {
  return useQuery({
    queryKey: resumeKeys.list(params),
    queryFn: () => listResumes(params),
    refetchInterval: (query) => getResumesRefetchInterval(query.state.data),
  })
}
