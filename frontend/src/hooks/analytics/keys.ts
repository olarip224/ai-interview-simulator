export const analyticsKeys = {
  all: ['analytics'] as const,
  summary: () => [...analyticsKeys.all, 'summary'] as const,
  progress: () => [...analyticsKeys.all, 'progress'] as const,
  weakTopics: () => [...analyticsKeys.all, 'weak-topics'] as const,
}
