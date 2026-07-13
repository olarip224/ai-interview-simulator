import apiClient from '@/lib/api'
import type { PageResponse, Resume, ResumeDetail } from '@/types/resume'

export async function uploadResume(file: File): Promise<Resume> {
  const formData = new FormData()
  formData.append('file', file)
  const { data } = await apiClient.post<Resume>('/resumes', formData, {
    headers: { 'Content-Type': undefined },
  })
  return data
}

export async function listResumes(params: { limit?: number; offset?: number } = {}): Promise<PageResponse<Resume>> {
  const { data } = await apiClient.get<PageResponse<Resume>>('/resumes', { params })
  return data
}

export async function getResume(id: string): Promise<ResumeDetail> {
  const { data } = await apiClient.get<ResumeDetail>(`/resumes/${id}`)
  return data
}

export async function reanalyzeResume(id: string): Promise<ResumeDetail> {
  const { data } = await apiClient.post<ResumeDetail>(`/resumes/${id}/analyze`)
  return data
}

export async function deleteResume(id: string): Promise<void> {
  await apiClient.delete(`/resumes/${id}`)
}
