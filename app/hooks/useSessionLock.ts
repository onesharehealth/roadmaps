import { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  GENERAL_EVENTS,
  getGeneralChannelName,
  getSessionLockChannelName,
  SESSION_LOCK_ACTIONS,
  SESSION_LOCK_EVENTS,
  type SessionLockState,
} from 'roadmaps-agents/schemas'

import { SessionDetailContext } from '~/components/session/SessionDetailContext'

type UseSessionLockProps = {
  sessionUuid: string
  initialLock?: SessionLockState | null
}

export type UseSessionLockReturn = {
  isLocked: boolean
  lockedAt: number | null
  setLock: (isLocked: boolean) => void
  isReady: boolean
}

export function useSessionLock({ sessionUuid, initialLock }: UseSessionLockProps): UseSessionLockReturn {
  const [lockState, setLockState] = useState<SessionLockState>(initialLock ?? { isLocked: false, lockedAt: null })
  const [isReady, setIsReady] = useState(false)

  const context = useContext(SessionDetailContext)
  const isConnected = context?.isConnected ?? false
  const isBootstrapped = context?.isBootstrapped ?? false
  const subscribeToChannel = context?.subscribeToChannel
  const publishToChannel = context?.publishToChannel
  const initialState = context?.initialState

  const sessionLockChannelName = useMemo(() => getSessionLockChannelName(sessionUuid), [sessionUuid])
  const generalChannelName = useMemo(() => getGeneralChannelName(sessionUuid), [sessionUuid])

  useEffect(() => {
    const sessionLock = (initialState as { sessionLock?: SessionLockState } | null)?.sessionLock
    if (sessionLock) setLockState(sessionLock)
  }, [initialState])

  useEffect(() => {
    if (!isConnected || !isBootstrapped || !sessionUuid || !subscribeToChannel) {
      setIsReady(false)
      return
    }

    const unsubscribe = subscribeToChannel(sessionLockChannelName, {
      [SESSION_LOCK_EVENTS.LOCK]: (payload) => {
        setLockState(payload as SessionLockState)
      },
      [SESSION_LOCK_EVENTS.GET_LOCK_CONFIRMED]: (payload) => {
        setLockState(payload as SessionLockState)
      },
      [SESSION_LOCK_EVENTS.ERROR]: (payload) => {
        console.error('[useSessionLock] Error:', payload)
      },
    })

    setIsReady(true)
    return () => {
      unsubscribe()
      setIsReady(false)
    }
  }, [isConnected, isBootstrapped, sessionLockChannelName, subscribeToChannel, sessionUuid])

  useEffect(() => {
    if (!isConnected || !isBootstrapped || !sessionUuid || !subscribeToChannel) return

    const unsubscribe = subscribeToChannel(generalChannelName, {
      [GENERAL_EVENTS.SESSION_LOCK_UPDATED]: (payload) => {
        setLockState(payload as SessionLockState)
      },
    })

    return unsubscribe
  }, [isConnected, isBootstrapped, generalChannelName, subscribeToChannel, sessionUuid])

  const setLock = useCallback(
    (isLocked: boolean) => {
      if (!isReady || !publishToChannel) return
      publishToChannel(sessionLockChannelName, SESSION_LOCK_ACTIONS.SET_LOCK, { isLocked })
    },
    [publishToChannel, sessionLockChannelName, isReady],
  )

  return {
    isLocked: lockState.isLocked,
    lockedAt: lockState.lockedAt,
    setLock,
    isReady,
  }
}
