import type { PageResponse, Resume, ResumeDetail } from '@/types/resume'

const PROCESSING_POLL_INTERVAL_MS = 3000

export function getResumeRefetchInterval(data: ResumeDetail | undefined): number | false {
  if (!data) return false
  return data.parsed_data === null ? PROCESSING_POLL_INTERVAL_MS : false
}

export function getResumesRefetchInterval(data: PageResponse<Resume> | undefined): number | false {
  if (!data) return false
  return data.items.some((resume) => !resume.is_analyzed) ? PROCESSING_POLL_INTERVAL_MS : false
}
