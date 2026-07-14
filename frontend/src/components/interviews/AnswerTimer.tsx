import { Progress as ProgressPrimitive } from '@base-ui/react/progress'
import { ProgressTrack, ProgressIndicator } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { formatCountdown, isTimerWarning } from '@/hooks/interviews/countdown'

interface AnswerTimerProps {
  secondsRemaining: number
  durationSeconds: number
}

export function AnswerTimer({ secondsRemaining, durationSeconds }: AnswerTimerProps) {
  const warning = isTimerWarning(secondsRemaining)
  const percentRemaining = (secondsRemaining / durationSeconds) * 100

  return (
    <ProgressPrimitive.Root value={percentRemaining} className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className={cn('font-medium tabular-nums', warning && 'text-destructive')}>
          {formatCountdown(secondsRemaining)}
        </span>
        <span className="text-muted-foreground">Time remaining</span>
      </div>
      <ProgressTrack>
        <ProgressIndicator className={cn(warning && 'bg-destructive')} />
      </ProgressTrack>
    </ProgressPrimitive.Root>
  )
}
