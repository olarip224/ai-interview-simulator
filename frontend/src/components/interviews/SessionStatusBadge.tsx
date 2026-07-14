import { Badge } from '@/components/ui/badge'
import type { SessionStatus } from '@/types/interview'

interface SessionStatusBadgeProps {
  status: SessionStatus
}

export function SessionStatusBadge({ status }: SessionStatusBadgeProps) {
  switch (status) {
    case 'completed':
      return <Badge variant="default">Completed</Badge>
    case 'abandoned':
      return <Badge variant="destructive">Abandoned</Badge>
    case 'active':
      return <Badge variant="secondary">Active</Badge>
  }
}
