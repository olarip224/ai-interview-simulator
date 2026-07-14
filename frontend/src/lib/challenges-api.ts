import apiClient from '@/lib/api'
import type {
  Attempt,
  AttemptDetail,
  Challenge,
  ChallengeDetail,
  PageResponse,
  SubmitAttemptResult,
  SubmitCodeRequest,
} from '@/types/challenge'

export async function listChallenges(
  params: { difficulty?: string; tag?: string; limit?: number; offset?: number } = {}
): Promise<PageResponse<Challenge>> {
  const { data } = await apiClient.get<PageResponse<Challenge>>('/challenges', { params })
  return data
}

export async function getChallenge(id: string): Promise<ChallengeDetail> {
  const { data } = await apiClient.get<ChallengeDetail>(`/challenges/${id}`)
  return data
}

export async function submitAttempt(challengeId: string, data: SubmitCodeRequest): Promise<SubmitAttemptResult> {
  const { data: result } = await apiClient.post<SubmitAttemptResult>(`/challenges/${challengeId}/attempts`, data)
  return result
}

export async function listAttempts(
  params: { challenge_id?: string; limit?: number; offset?: number } = {}
): Promise<PageResponse<Attempt>> {
  const { data } = await apiClient.get<PageResponse<Attempt>>('/challenges/me/attempts', { params })
  return data
}

export async function getAttempt(id: string): Promise<AttemptDetail> {
  const { data } = await apiClient.get<AttemptDetail>(`/challenges/me/attempts/${id}`)
  return data
}
