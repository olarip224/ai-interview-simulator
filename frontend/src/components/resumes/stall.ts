const STALL_THRESHOLD_MS = 90 * 1000

export function isResumeStalled(createdAt: string, now: Date): boolean {
  return now.getTime() - new Date(createdAt).getTime() >= STALL_THRESHOLD_MS
}
