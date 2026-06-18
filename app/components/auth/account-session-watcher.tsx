import { useCallback, useRef } from 'react'
import { useFetcher } from 'react-router'
import { USER_ACCOUNT_EVENTS } from 'roadmaps-agents/schemas'
import { useWebSocketAgent } from 'websockets/client'

import { useIdleStatus } from '~/components/session/IdleProvider'
import { userAgentPartyName } from '~/utils/user-agents'

type AccountSessionWatcherProps = {
  userEmail: string
}

export function AccountSessionWatcher({ userEmail }: AccountSessionWatcherProps) {
  const fetcher = useFetcher()
  const hasLoggedOut = useRef(false)
  const { clientInstanceId } = useIdleStatus()

  const logout = useCallback(() => {
    if (hasLoggedOut.current) return
    hasLoggedOut.current = true
    fetcher.submit({}, { method: 'post', action: '/logout' })
  }, [fetcher])

  useWebSocketAgent({
    agent: userAgentPartyName,
    name: userEmail,
    enableIdleTracking: false,
    enableConnectedUsersTracking: false,
    metadata: { clientInstanceId },
    onMessage: (event) => {
      try {
        const data = JSON.parse(event.data)

        if (data.type === USER_ACCOUNT_EVENTS.REVOKED) {
          logout()
          return true
        }
      } catch {
        // Ignore malformed messages
      }

      return false
    },
  })

  return null
}
