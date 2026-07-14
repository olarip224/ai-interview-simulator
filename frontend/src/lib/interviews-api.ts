import apiClient from '@/lib/api'
import type {
  AnswerFeedback,
  CompleteSessionResult,
  CreateSessionRequest,
  PageResponse,
  Question,
  Session,
  SessionDetail,
  SessionFeedback,
  SubmitAnswerRequest,
} from '@/types/interview'

export async function createSession(data: CreateSessionRequest): Promise<Session> {
  const { data: session } = await apiClient.post<Session>('/interviews/sessions', data)
  return session
}

export async function listSessions(
  params: { limit?: number; offset?: number; status?: string } = {}
): Promise<PageResponse<Session>> {
  const { data } = await apiClient.get<PageResponse<Session>>('/interviews/sessions', { params })
  return data
}

export async function getSession(id: string): Promise<SessionDetail> {
  const { data } = await apiClient.get<SessionDetail>(`/interviews/sessions/${id}`)
  return data
}

export async function generateQuestion(sessionId: string): Promise<Question> {
  const { data } = await apiClient.post<Question>(`/interviews/sessions/${sessionId}/questions`)
  return data
}

export async function submitAnswer(
  sessionId: string,
  questionId: string,
  data: SubmitAnswerRequest
): Promise<AnswerFeedback> {
  const { data: result } = await apiClient.post<AnswerFeedback>(
    `/interviews/sessions/${sessionId}/questions/${questionId}/answers`,
    data
  )
  return result
}

export async function completeSession(sessionId: string): Promise<CompleteSessionResult> {
  const { data } = await apiClient.post<CompleteSessionResult>(`/interviews/sessions/${sessionId}/complete`)
  return data
}

export async function getSessionFeedback(sessionId: string): Promise<SessionFeedback> {
  const { data } = await apiClient.get<SessionFeedback>(`/interviews/sessions/${sessionId}/feedback`)
  return data
}
