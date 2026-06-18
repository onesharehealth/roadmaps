import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
} from 'react'
import type { SessionType } from 'roadmaps-agents/schemas'
import { getGeneralChannelName } from 'roadmaps-agents/schemas'
import { useWebSocketAgent } from 'websockets/client'
import type { ConnectedUser } from 'websockets/types'

import { useIdleStatus } from '~/components/session/IdleProvider'
import { getSessionAgentName } from '~/utils/session-agents'

export interface SessionConnectionContextType {
  connection: ReturnType<typeof useWebSocketAgent>['connection']
  isConnected: boolean
  connectedUsers: ConnectedUser[]
  isAttemptingReconnect: boolean
  sessionUuid: string
  sessionType: SessionType
  clientInstanceId: string
  subscribeToChannel: ReturnType<typeof useWebSocketAgent>['subscribeToChannel']
  publishToChannel: ReturnType<typeof useWebSocketAgent>['publishToChannel']
}

const SessionConnectionContext =
  createContext<SessionConnectionContextType | null>(null)

type SessionConnectionProviderProps = {
  children: ReactNode
  sessionType: SessionType
  uuid: string
  agentName?: string
}

export function SessionConnectionProvider({
  children,
  sessionType,
  uuid,
  agentName,
}: SessionConnectionProviderProps) {
  const { isIdle, clientInstanceId } = useIdleStatus()

  const handleOpen = useCallback(() => {
    console.log('[session-connection] Connected')
  }, [])

  const handleClose = useCallback(() => {
    console.log('[session-connection] Disconnected')
  }, [])

  const handleError = useCallback((error: unknown) => {
    console.error('[session-connection] WebSocket error:', error)
  }, [])

  const metadata = useMemo(
    () => ({
      clientInstanceId,
    }),
    [clientInstanceId],
  )

  const agent = agentName ?? getSessionAgentName(sessionType)

  const {
    connection,
    isConnected,
    connectedUsers,
    isAttemptingReconnect,
    subscribeToChannel,
    publishToChannel,
  } = useWebSocketAgent({
    agent,
    name: uuid,
    metadata,
    externalIsIdle: isIdle,
    onOpen: handleOpen,
    onClose: handleClose,
    onError: handleError,
  })

  const generalChannelName = getGeneralChannelName(uuid)
  subscribeToChannel(generalChannelName, {
    '*': (payload) => {
      console.log('[session-general-channel] Received event:', payload)
    },
  })

  const contextValue = useMemo(
    () => ({
      connection,
      isConnected,
      connectedUsers,
      isAttemptingReconnect,
      sessionUuid: uuid,
      sessionType,
      clientInstanceId,
      subscribeToChannel,
      publishToChannel,
    }),
    [
      connection,
      isConnected,
      connectedUsers,
      isAttemptingReconnect,
      uuid,
      sessionType,
      clientInstanceId,
      subscribeToChannel,
      publishToChannel,
    ],
  )

  return (
    <SessionConnectionContext.Provider value={contextValue}>
      {children}
    </SessionConnectionContext.Provider>
  )
}

export function useSessionConnection() {
  const context = useContext(SessionConnectionContext)
  if (!context) {
    throw new Error(
      'useSessionConnection must be used within a SessionConnectionProvider',
    )
  }
  return context
}
