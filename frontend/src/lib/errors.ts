interface ApiErrorMessageOptions {
  rateLimitMessage: string
  fallbackMessage: string
}

/** Shared shape of an axios error response body across this API. */
type AxiosLikeError = { response?: { status?: number; data?: { detail?: unknown } } }

export function getApiErrorMessage(error: unknown, { rateLimitMessage, fallbackMessage }: ApiErrorMessageOptions): string {
  const response = (error as AxiosLikeError)?.response
  if (response?.status === 429) return rateLimitMessage
  if (typeof response?.data?.detail === 'string') return response.data.detail
  return fallbackMessage
}
