import { useMutation, useQueryClient } from '@tanstack/react-query'
import { reanalyzeResume } from '@/lib/resumes-api'
import { resumeKeys } from '@/hooks/resumes/keys'

export function useReanalyzeResume() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: reanalyzeResume,
    onSuccess: (detail) => {
      queryClient.setQueryData(resumeKeys.detail(detail.id), detail)
      queryClient.invalidateQueries({ queryKey: resumeKeys.lists() })
    },
  })
}
