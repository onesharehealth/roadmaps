import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useNavigate } from 'react-router'
import type {
  CompleteDotStats,
  CompletePropertyStats,
  DotVotingSettings,
  PropertyVotingSettings,
  RoadmapItem,
  RoadmapTimelineSettings,
  SessionLockState,
  SessionPublicState,
  SessionType,
  SharingInfo,
  VotingProperty,
} from 'roadmaps-agents/schemas'
import { GENERAL_EVENTS } from 'roadmaps-agents/schemas'

import { useSharing } from '~/hooks/useSharing'
import { type SessionConnectionContextType, useSessionConnection } from './SessionConnectionContext'

export type SessionDetailInitialState = {
  items: { items: RoadmapItem[] }
  sharingInfo?: SharingInfo
  sessionLock?: SessionLockState
  dotVoteStats?: CompleteDotStats
  dotVotingSettings?: DotVotingSettings
  timelineSettings?: RoadmapTimelineSettings
  propertyVotingSettings?: PropertyVotingSettings
  votingProperties?: { properties: VotingProperty[] }
  completePropertyStats?: Record<string, CompletePropertyStats>
}

export interface SessionDetailContextType extends SessionConnectionContextType {
  userEmail: string
  session: SessionPublicState
  sessionType: SessionType
  initialState: SessionDetailInitialState | null
  isBootstrapped: boolean
  connectionError: string | null
  sessionName: string | null
  canEdit: boolean
  canVote: boolean
  canManageSession: boolean
  isLocked: boolean
  sharingInfo: SharingInfo
}

export const SessionDetailContext = createContext<SessionDetailContextType | null>(null)

function wasExplicitShareUser(sharingInfo: SharingInfo, userEmail: string) {
  return sharingInfo.sharedWith.some((share) => share.email === userEmail)
}

function hasExplicitShareAccess(sharingInfo: SharingInfo, userEmail: string) {
  return sharingInfo.ownerEmail === userEmail || sharingInfo.sharedWith.some((share) => share.email === userEmail)
}

type SessionDetailProviderProps = {
  children: ReactNode
  userEmail: string
  session: SessionPublicState
  sessionType: SessionType
  initialSessionName: string
  canEdit: boolean
  canVote: boolean
  canManageSession: boolean
  initialIsLocked?: boolean
  initialSharingInfo: SharingInfo
}

export function SessionDetailProvider({
  children,
  userEmail,
  session,
  sessionType,
  initialSessionName,
  canEdit,
  canVote,
  canManageSession,
  initialIsLocked = false,
  initialSharingInfo,
}: SessionDetailProviderProps) {
  const navigate = useNavigate()
  const connection = useSessionConnection()
  const hadShareAccessRef = useRef(wasExplicitShareUser(initialSharingInfo, userEmail))
  const [initialState, setInitialState] = useState<SessionDetailInitialState | null>(null)
  const [isBootstrapped, setIsBootstrapped] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [sessionName, setSessionName] = useState<string | null>(initialSessionName)
  const [isLocked, setIsLocked] = useState(initialIsLocked)

  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data)

      if (data.type === 'error' && data.message) {
        setConnectionError(String(data.message))
        setIsBootstrapped(false)
        return
      }

      if (data.type === 'initial-state' && data.data) {
        setInitialState(data.data)
        setIsBootstrapped(true)
        setConnectionError(null)
        const sessionLock = data.data.sessionLock as SessionLockState | undefined
        if (sessionLock) setIsLocked(sessionLock.isLocked)
      }

      if (data.type === 'channel') {
        const { channel, action, payload } = data

        if (channel?.includes(':general') && action === GENERAL_EVENTS.NAME_UPDATED && payload?.name) {
          setSessionName(payload.name)
        }

        if (channel?.includes(':general') && action === GENERAL_EVENTS.SESSION_LOCK_UPDATED) {
          const lockState = payload as SessionLockState
          setIsLocked(lockState.isLocked)
        }
      }
    } catch (error) {
      console.error('[SessionDetailProvider] Error parsing message:', error)
    }
  }, [])

  useEffect(() => {
    if (!connection.isConnected) {
      setIsBootstrapped(false)
    }
  }, [connection.isConnected])

  useEffect(() => {
    if (!connection.connection) return

    connection.connection.addEventListener('message', handleMessage)
    return () => {
      connection.connection?.removeEventListener('message', handleMessage)
    }
  }, [connection.connection, handleMessage])

  const { sharingInfo } = useSharing({
    sessionUuid: session.uuid,
    initialSharingInfo,
    isConnected: connection.isConnected,
    isBootstrapped,
    subscribeToChannel: connection.subscribeToChannel,
    initialState,
  })

  useEffect(() => {
    if (!hadShareAccessRef.current) return
    if (!hasExplicitShareAccess(sharingInfo, userEmail)) {
      navigate('/', { replace: true })
    }
  }, [sharingInfo, userEmail, navigate])

  useEffect(() => {
    if (connectionError === 'Forbidden') {
      navigate('/', { replace: true })
    }
  }, [connectionError, navigate])

  const value = useMemo(
    () => ({
      ...connection,
      userEmail,
      session,
      sessionType,
      initialState,
      isBootstrapped,
      connectionError,
      sessionName,
      canEdit,
      canVote,
      canManageSession,
      isLocked,
      sharingInfo,
    }),
    [
      connection,
      userEmail,
      session,
      sessionType,
      initialState,
      isBootstrapped,
      connectionError,
      sessionName,
      canEdit,
      canVote,
      canManageSession,
      isLocked,
      sharingInfo,
    ],
  )

  return <SessionDetailContext.Provider value={value}>{children}</SessionDetailContext.Provider>
}

export function useSessionDetail() {
  const context = useContext(SessionDetailContext)
  if (!context) {
    throw new Error('useSessionDetail must be used within a SessionDetailProvider')
  }
  return context
}
