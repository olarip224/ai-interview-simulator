export const sessionKeys = {
  all: ['interview-sessions'] as const,
  lists: () => [...sessionKeys.all, 'list'] as const,
  list: (params: { limit?: number; offset?: number; status?: string }) => [...sessionKeys.lists(), params] as const,
  details: () => [...sessionKeys.all, 'detail'] as const,
  detail: (id: string) => [...sessionKeys.details(), id] as const,
  feedbacks: () => [...sessionKeys.all, 'feedback'] as const,
  feedback: (id: string) => [...sessionKeys.feedbacks(), id] as const,
}
