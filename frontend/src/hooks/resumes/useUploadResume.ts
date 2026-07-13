import { useMutation, useQueryClient } from '@tanstack/react-query'
import { uploadResume } from '@/lib/resumes-api'
import { resumeKeys } from '@/hooks/resumes/keys'

export function useUploadResume() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: uploadResume,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: resumeKeys.lists() })
    },
  })
}
