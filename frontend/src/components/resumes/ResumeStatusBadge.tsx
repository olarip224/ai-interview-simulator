import { Badge } from '@/components/ui/badge'
import { isResumeStalled } from '@/components/resumes/stall'

type ResumeStatus = 'analyzed' | 'processing' | 'stalled'

function getResumeStatus(isAnalyzed: boolean, createdAt: string, now: Date): ResumeStatus {
  if (isAnalyzed) return 'analyzed'
  return isResumeStalled(createdAt, now) ? 'stalled' : 'processing'
}

interface ResumeStatusBadgeProps {
  isAnalyzed: boolean
  createdAt: string
  now?: Date
}

export function ResumeStatusBadge({ isAnalyzed, createdAt, now = new Date() }: ResumeStatusBadgeProps) {
  const status = getResumeStatus(isAnalyzed, createdAt, now)

  switch (status) {
    case 'analyzed':
      return <Badge variant="default">Analyzed</Badge>
    case 'stalled':
      return <Badge variant="destructive">Taking longer than expected</Badge>
    case 'processing':
      return <Badge variant="secondary">Processing</Badge>
  }
}
