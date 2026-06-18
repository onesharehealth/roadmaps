import { type MutableRefObject,useEffect, useRef } from 'react'

import type { WebSocketAgentReturn } from '../types'

export function useIdleSync({
  connection,
  isConnected,
  enableIdleTracking,
  isIdle,
  wasIdle,
  setWasIdle,
}: {
  connection: WebSocketAgentReturn['connection']
  isConnected: boolean
  enableIdleTracking: boolean
  isIdle: boolean
  wasIdle: boolean
  setWasIdle: (value: boolean) => void
}): { isIdleRef: MutableRefObject<boolean> } {
  const isIdleRef = useRef(isIdle)

  // Keep ref in sync with current isIdle state
  useEffect(() => {
    isIdleRef.current = isIdle
  }, [isIdle])

  // Handle idle status changes
  useEffect(() => {
    if (!enableIdleTracking || !connection || !isConnected) return

    if (isIdle && !wasIdle) {
      // User just went idle
      setWasIdle(true)
      connection.send(
        JSON.stringify({
          type: 'activity:idle-status',
          data: { isIdle: true },
        }),
      )
    } else if (!isIdle && wasIdle) {
      // User just returned from idle
      setWasIdle(false)
      connection.send(
        JSON.stringify({
          type: 'activity:idle-status',
          data: { isIdle: false },
        }),
      )
    }
  }, [isIdle, wasIdle, connection, isConnected, enableIdleTracking, setWasIdle])

  return { isIdleRef }
}
