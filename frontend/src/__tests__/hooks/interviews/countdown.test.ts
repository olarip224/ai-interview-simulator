import { describe, it, expect } from 'vitest'
import { isTimerWarning, formatCountdown, TIMER_WARNING_THRESHOLD_SECONDS } from '@/hooks/interviews/countdown'

describe('isTimerWarning', () => {
  it('returns false well above the threshold', () => {
    expect(isTimerWarning(120)).toBe(false)
  })

  it('returns true at exactly the threshold', () => {
    expect(isTimerWarning(TIMER_WARNING_THRESHOLD_SECONDS)).toBe(true)
  })

  it('returns true just under the threshold', () => {
    expect(isTimerWarning(1)).toBe(true)
  })

  it('returns false at zero (expired, not "warning")', () => {
    expect(isTimerWarning(0)).toBe(false)
  })

  it('respects a custom threshold', () => {
    expect(isTimerWarning(45, 60)).toBe(true)
    expect(isTimerWarning(45, 30)).toBe(false)
  })
})

describe('formatCountdown', () => {
  it('formats whole minutes', () => {
    expect(formatCountdown(180)).toBe('3:00')
  })

  it('pads single-digit seconds', () => {
    expect(formatCountdown(65)).toBe('1:05')
  })

  it('formats zero', () => {
    expect(formatCountdown(0)).toBe('0:00')
  })

  it('clamps negative values to zero', () => {
    expect(formatCountdown(-5)).toBe('0:00')
  })
})
