export const challengeKeys = {
  all: ['challenges'] as const,
  lists: () => [...challengeKeys.all, 'list'] as const,
  list: (params: { difficulty?: string; tag?: string; limit?: number; offset?: number }) =>
    [...challengeKeys.lists(), params] as const,
  details: () => [...challengeKeys.all, 'detail'] as const,
  detail: (id: string) => [...challengeKeys.details(), id] as const,
}

export const attemptKeys = {
  all: ['challenge-attempts'] as const,
  lists: () => [...attemptKeys.all, 'list'] as const,
  list: (params: { challenge_id?: string; limit?: number; offset?: number }) => [...attemptKeys.lists(), params] as const,
  details: () => [...attemptKeys.all, 'detail'] as const,
  detail: (id: string) => [...attemptKeys.details(), id] as const,
}
