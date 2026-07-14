export function getSubmitErrorMessage(error: unknown): string {
  const response = (error as { response?: { status?: number; data?: { detail?: unknown } } })?.response
  if (response?.status === 429) return 'Too many submissions — try again in a minute.'
  if (typeof response?.data?.detail === 'string') return response.data.detail
  return 'Failed to submit your solution. Please try again.'
}
