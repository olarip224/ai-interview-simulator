import type { FileRejection } from 'react-dropzone'
import { getApiErrorMessage } from '@/lib/errors'

export function getUploadRejectionMessage(fileRejections: FileRejection[]): string | null {
  if (fileRejections.length === 0) return null
  const [{ errors }] = fileRejections
  if (errors.some((e) => e.code === 'file-too-large')) return 'File exceeds the 10 MB size limit'
  if (errors.some((e) => e.code === 'file-invalid-type')) return 'Only PDF files are accepted'
  return errors[0]?.message ?? 'File was rejected'
}

export function getUploadErrorMessage(error: unknown): string {
  return getApiErrorMessage(error, {
    rateLimitMessage: 'Too many uploads — try again in a minute.',
    fallbackMessage: 'Upload failed. Please try again.',
  })
}
