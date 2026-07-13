import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteResume } from '@/lib/resumes-api'
import { resumeKeys } from '@/hooks/resumes/keys'

export function useDeleteResume() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteResume,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: resumeKeys.lists() })
    },
  })
}
