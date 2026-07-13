import type { FileRejection } from 'react-dropzone'

export function getUploadRejectionMessage(fileRejections: FileRejection[]): string | null {
  if (fileRejections.length === 0) return null
  const [{ errors }] = fileRejections
  if (errors.some((e) => e.code === 'file-too-large')) return 'File exceeds the 10 MB size limit'
  if (errors.some((e) => e.code === 'file-invalid-type')) return 'Only PDF files are accepted'
  return errors[0]?.message ?? 'File was rejected'
}

export function getUploadErrorMessage(error: unknown): string {
  const response = (error as { response?: { status?: number; data?: { detail?: unknown } } })?.response
  if (response?.status === 429) return 'Too many uploads — try again in a minute.'
  if (typeof response?.data?.detail === 'string') return response.data.detail
  return 'Upload failed. Please try again.'
}
