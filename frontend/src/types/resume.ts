// ─── Shared ─────────────────────────────────────────────────────────────────

export interface PageResponse<T> {
  items: T[]
  total: number
  limit: number
  offset: number
}

// ─── Response shapes ────────────────────────────────────────────────────────

/** Returned by GET /resumes (list item) and POST /resumes (upload) */
export interface Resume {
  id: string
  filename: string
  is_active: boolean
  is_analyzed: boolean
  created_at: string // ISO 8601
}

export interface ResumeExperience {
  title: string
  company: string
  duration: string
  description: string
}

export interface ResumeEducation {
  degree: string
  institution: string
  year: string
}

export interface ParsedResumeData {
  skills: string[]
  experience: ResumeExperience[]
  education: ResumeEducation[]
  summary: string
}

/** Returned by GET /resumes/{id} and POST /resumes/{id}/analyze */
export interface ResumeDetail {
  id: string
  filename: string
  is_active: boolean
  created_at: string // ISO 8601
  parsed_data: ParsedResumeData | null
}
