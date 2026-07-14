import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCountdown } from '@/hooks/interviews/useCountdown'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useCountdown', () => {
  it('starts at durationSeconds and ticks down by one per second', () => {
    const { result } = renderHook(() => useCountdown({ durationSeconds: 5, onExpire: vi.fn() }))
    expect(result.current.secondsRemaining).toBe(5)

    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(result.current.secondsRemaining).toBe(4)

    act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(result.current.secondsRemaining).toBe(2)
  })

  it('calls onExpire exactly once when it reaches zero, and stays at zero', () => {
    const onExpire = vi.fn()
    const { result } = renderHook(() => useCountdown({ durationSeconds: 2, onExpire }))

    act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(result.current.secondsRemaining).toBe(0)
    expect(result.current.isExpired).toBe(true)
    expect(onExpire).toHaveBeenCalledOnce()

    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(result.current.secondsRemaining).toBe(0)
    expect(onExpire).toHaveBeenCalledOnce()
  })

  it('does not tick down while paused', () => {
    const { result, rerender } = renderHook(
      ({ isPaused }) => useCountdown({ durationSeconds: 5, onExpire: vi.fn(), isPaused }),
      { initialProps: { isPaused: false } }
    )

    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(result.current.secondsRemaining).toBe(4)

    rerender({ isPaused: true })
    act(() => {
      vi.advanceTimersByTime(3000)
    })
    expect(result.current.secondsRemaining).toBe(4)
  })

  it('never calls onExpire if paused before reaching zero', () => {
    const onExpire = vi.fn()
    const { rerender } = renderHook(({ isPaused }) => useCountdown({ durationSeconds: 3, onExpire, isPaused }), {
      initialProps: { isPaused: false },
    })

    act(() => {
      vi.advanceTimersByTime(1000)
    })
    rerender({ isPaused: true })
    act(() => {
      vi.advanceTimersByTime(10000)
    })
    expect(onExpire).not.toHaveBeenCalled()
  })
})
