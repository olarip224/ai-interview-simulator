import { useEffect, useRef, useState } from 'react'

interface UseCountdownOptions {
  durationSeconds: number
  onExpire: () => void
  isPaused?: boolean
}

interface UseCountdownResult {
  secondsRemaining: number
  isExpired: boolean
}

/**
 * Ticks down from durationSeconds once per second, firing onExpire exactly once
 * when it reaches zero. Pausing (e.g. while a submit request is in flight) just
 * stops the interval without resetting secondsRemaining or re-arming onExpire.
 */
export function useCountdown({ durationSeconds, onExpire, isPaused = false }: UseCountdownOptions): UseCountdownResult {
  const [secondsRemaining, setSecondsRemaining] = useState(durationSeconds)
  const onExpireRef = useRef(onExpire)
  onExpireRef.current = onExpire
  const hasExpiredRef = useRef(false)

  useEffect(() => {
    if (isPaused || hasExpiredRef.current) return

    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          if (!hasExpiredRef.current) {
            hasExpiredRef.current = true
            onExpireRef.current()
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [isPaused])

  return {
    secondsRemaining,
    isExpired: secondsRemaining <= 0,
  }
}
