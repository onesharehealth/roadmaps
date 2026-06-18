import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Throttle utility function
 * Creates a throttled function that only invokes func at most once per wait milliseconds
 */
function throttle(cb: () => void, ms: number): () => void {
  let lastTime = 0
  return () => {
    const now = Date.now()
    if (now - lastTime >= ms) {
      cb()
      lastTime = now
    }
  }
}

/**
 * Default events that trigger user activity
 */
const DEFAULT_IDLE_EVENTS: IdleEvent[] = ['mousemove', 'mousedown', 'resize', 'keydown', 'touchstart', 'wheel']

export type IdleEvent = 'mousemove' | 'mousedown' | 'resize' | 'keydown' | 'touchstart' | 'wheel'

export interface UseIdleOptions {
  /**
   * Events that should reset the idle timer
   * @default ['mousemove', 'mousedown', 'resize', 'keydown', 'touchstart', 'wheel']
   */
  events?: IdleEvent[]

  /**
   * Throttle delay for event handlers in milliseconds
   * @default 500
   */
  throttleMs?: number
}

/**
 * Core idle detection hook
 *
 * Tracks user activity based on configurable DOM events and returns whether
 * the user has been idle for longer than the specified timeout.
 *
 * @param timeout - Time in milliseconds before considering the user idle
 * @param options - Configuration for which events to track and throttling
 * @returns boolean indicating if user is currently idle
 */
export function useIdle(timeout = 600000, options: UseIdleOptions = {}): boolean {
  const { events = DEFAULT_IDLE_EVENTS, throttleMs = 500 } = options
  const [idle, setIdle] = useState(false)
  const timeoutIdRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    const handleTimeout = () => {
      setIdle(true)
    }

    const handleEvent = throttle(() => {
      setIdle(false)
      window.clearTimeout(timeoutIdRef.current)
      timeoutIdRef.current = window.setTimeout(handleTimeout, timeout)
    }, throttleMs)

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        handleEvent()
      }
    }

    // Start the initial timeout
    timeoutIdRef.current = window.setTimeout(handleTimeout, timeout)

    // Add event listeners for configured events
    events.forEach((event) => {
      window.addEventListener(event, handleEvent)
    })

    // Always listen to visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      // Clean up event listeners
      events.forEach((event) => {
        window.removeEventListener(event, handleEvent)
      })
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.clearTimeout(timeoutIdRef.current)
    }
  }, [timeout, events, throttleMs])

  return idle
}

export interface IdleTrackingOptions {
  /**
   * Idle timeout in milliseconds
   * @default 600000 (10 minutes)
   */
  timeout?: number

  /**
   * Events that should reset the idle timer
   * Use fewer events (e.g., ['mousedown', 'keydown']) to reduce Durable Object wake-ups
   * @default ['mousemove', 'mousedown', 'resize', 'keydown', 'touchstart', 'wheel']
   */
  events?: IdleEvent[]

  /**
   * Throttle delay for event handlers in milliseconds
   * @default 500
   */
  throttleMs?: number

  /**
   * Callback when user goes idle
   */
  onIdle?: () => void

  /**
   * Callback when user returns from idle
   */
  onActive?: () => void

  /**
   * Whether idle tracking is enabled
   * @default true
   */
  enabled?: boolean
}

export interface IdleTrackingReturn {
  /**
   * Whether the user is currently idle
   */
  isIdle: boolean

  /**
   * Manually set idle status
   */
  setIdle: (idle: boolean) => void

  /**
   * Reset the idle timer
   */
  resetIdleTimer: () => void
}

/**
 * Hook for tracking user idle status with callbacks
 *
 * Provides idle detection with configurable events, callbacks, and manual control.
 * Useful for managing WebSocket connections and Durable Object wake-ups.
 *
 * @example
 * // Less aggressive idle tracking (only clicks and keyboard)
 * const { isIdle } = useIdleTracking({
 *   timeout: 10000,
 *   events: ['mousedown', 'keydown'],
 *   onIdle: () => console.log('User went idle'),
 *   onActive: () => console.log('User is active')
 * })
 */
export function useIdleTracking({
  timeout = 600000, // 10 minutes
  events,
  throttleMs,
  onIdle,
  onActive,
  enabled = true,
}: IdleTrackingOptions = {}): IdleTrackingReturn {
  const isIdle = useIdle(enabled ? timeout : Number.MAX_SAFE_INTEGER, { events, throttleMs })
  const [wasIdle, setWasIdle] = useState(false)
  const [manualIdle, setManualIdle] = useState<boolean | null>(null)

  // Handle automatic idle state changes
  useEffect(() => {
    if (!enabled) return

    if (isIdle && !wasIdle) {
      setWasIdle(true)
      onIdle?.()
    } else if (!isIdle && wasIdle) {
      setWasIdle(false)
      onActive?.()
    }
  }, [isIdle, wasIdle, enabled, onIdle, onActive])

  const setIdle = useCallback(
    (idle: boolean) => {
      setManualIdle(idle)
      if (idle && !wasIdle) {
        setWasIdle(true)
        onIdle?.()
      } else if (!idle && wasIdle) {
        setWasIdle(false)
        onActive?.()
      }
    },
    [wasIdle, onIdle, onActive],
  )

  const resetIdleTimer = useCallback(() => {
    setManualIdle(null)
    // The useIdle hook doesn't expose a reset function,
    // so we simulate user activity by triggering a manual active state
    if (wasIdle) {
      setWasIdle(false)
      onActive?.()
    }
  }, [wasIdle, onActive])

  // Return manual idle state if set, otherwise use automatic detection
  const currentIdleState = manualIdle !== null ? manualIdle : isIdle

  return {
    isIdle: currentIdleState,
    setIdle,
    resetIdleTimer,
  }
}
