export const DEFAULT_QUESTION_TIME_LIMIT_SECONDS = 180
export const TIMER_WARNING_THRESHOLD_SECONDS = 30

export function isTimerWarning(secondsRemaining: number, thresholdSeconds = TIMER_WARNING_THRESHOLD_SECONDS): boolean {
  return secondsRemaining > 0 && secondsRemaining <= thresholdSeconds
}

export function formatCountdown(secondsRemaining: number): string {
  const clamped = Math.max(0, secondsRemaining)
  const minutes = Math.floor(clamped / 60)
  const seconds = clamped % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}
