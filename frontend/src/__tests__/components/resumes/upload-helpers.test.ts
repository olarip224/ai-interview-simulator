import { describe, it, expect } from 'vitest'
import { getUploadRejectionMessage, getUploadErrorMessage } from '@/components/resumes/upload-helpers'
import type { FileRejection } from 'react-dropzone'

describe('getUploadRejectionMessage', () => {
  it('returns null when there are no rejections', () => {
    expect(getUploadRejectionMessage([])).toBeNull()
  })

  it('returns a size-limit message for file-too-large', () => {
    const rejections = [
      { file: new File(['x'], 'big.pdf'), errors: [{ code: 'file-too-large', message: 'too big' }] },
    ] as unknown as FileRejection[]
    expect(getUploadRejectionMessage(rejections)).toBe('File exceeds the 10 MB size limit')
  })

  it('returns a type message for file-invalid-type', () => {
    const rejections = [
      { file: new File(['x'], 'notes.txt'), errors: [{ code: 'file-invalid-type', message: 'bad type' }] },
    ] as unknown as FileRejection[]
    expect(getUploadRejectionMessage(rejections)).toBe('Only PDF files are accepted')
  })
})

describe('getUploadErrorMessage', () => {
  it('returns a rate-limit message for 429 responses', () => {
    const error = { response: { status: 429 } }
    expect(getUploadErrorMessage(error)).toBe('Too many uploads — try again in a minute.')
  })

  it('passes through the backend detail message for 400 responses', () => {
    const error = { response: { status: 400, data: { detail: 'Only PDF files are accepted' } } }
    expect(getUploadErrorMessage(error)).toBe('Only PDF files are accepted')
  })

  it('falls back to a generic message for unrecognized errors', () => {
    expect(getUploadErrorMessage(new Error('network down'))).toBe('Upload failed. Please try again.')
  })
})
