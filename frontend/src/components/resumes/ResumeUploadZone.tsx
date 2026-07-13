'use client'

import { useCallback, useState } from 'react'
import { useDropzone, type FileRejection } from 'react-dropzone'
import { toast } from 'sonner'
import { Loader2, UploadCloud } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { cn } from '@/lib/utils'
import { useUploadResume } from '@/hooks/resumes/useUploadResume'
import { getUploadErrorMessage, getUploadRejectionMessage } from '@/components/resumes/upload-helpers'

const MAX_SIZE_BYTES = 10 * 1024 * 1024

export function ResumeUploadZone() {
  const [error, setError] = useState<string | null>(null)
  const uploadMutation = useUploadResume()

  const onDrop = useCallback(
    (acceptedFiles: File[], fileRejections: FileRejection[]) => {
      const rejectionMessage = getUploadRejectionMessage(fileRejections)
      if (rejectionMessage) {
        setError(rejectionMessage)
        return
      }

      const file = acceptedFiles[0]
      if (!file) return

      setError(null)
      uploadMutation.mutate(file, {
        onSuccess: () => toast.success(`${file.name} uploaded — analyzing now`),
        onError: (err) => setError(getUploadErrorMessage(err)),
      })
    },
    [uploadMutation]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxSize: MAX_SIZE_BYTES,
    multiple: false,
    disabled: uploadMutation.isPending,
  })

  return (
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground transition-colors',
          isDragActive && 'border-primary bg-primary/5',
          uploadMutation.isPending && 'cursor-not-allowed opacity-60'
        )}
      >
        <input {...getInputProps()} aria-label="Upload resume PDF" />
        {uploadMutation.isPending ? <Loader2 className="animate-spin" /> : <UploadCloud />}
        <p>Drag and drop a PDF resume here, or click to browse</p>
        <p className="text-xs">PDF only, up to 10 MB</p>
      </div>
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Upload failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}
