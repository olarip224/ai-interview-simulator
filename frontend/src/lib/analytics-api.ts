import apiClient from '@/lib/api'
import type { ProgressItem, UserSummary, WeakTopicItem } from '@/types/analytics'

export async function getSummary(): Promise<UserSummary> {
  const { data } = await apiClient.get<UserSummary>('/analytics/me/summary')
  return data
}

export async function getProgress(): Promise<ProgressItem[]> {
  const { data } = await apiClient.get<ProgressItem[]>('/analytics/me/progress')
  return data
}

export async function getWeakTopics(): Promise<WeakTopicItem[]> {
  const { data } = await apiClient.get<WeakTopicItem[]>('/analytics/me/weak-topics')
  return data
}
