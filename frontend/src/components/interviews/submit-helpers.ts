import { getApiErrorMessage } from '@/lib/errors'

export function getSubmitErrorMessage(error: unknown): string {
  return getApiErrorMessage(error, {
    rateLimitMessage: 'Too many submissions — try again in a minute.',
    fallbackMessage: 'Failed to submit answer. Please try again.',
  })
}
