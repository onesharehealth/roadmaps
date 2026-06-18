import { useEffect, useMemo, useState } from 'react'
import { getSharingChannelName, SHARING_EVENTS, type SharingInfo } from 'roadmaps-agents/schemas'
import type { useWebSocketAgent } from 'websockets/client'

type UseSharingConnectionProps = {
  sessionUuid: string
  initialSharingInfo: SharingInfo
  isConnected: boolean
  isBootstrapped: boolean
  subscribeToChannel?: ReturnType<typeof useWebSocketAgent>['subscribeToChannel']
  initialState?: { sharingInfo?: SharingInfo } | null
}

export interface UseSharingReturn {
  sharingInfo: SharingInfo
  isReady: boolean
}

export function useSharing({
  sessionUuid,
  initialSharingInfo,
  isConnected,
  isBootstrapped,
  subscribeToChannel,
  initialState,
}: UseSharingConnectionProps): UseSharingReturn {
  const [sharingInfo, setSharingInfo] = useState<SharingInfo>(initialSharingInfo)
  const [isReady, setIsReady] = useState(false)

  const sharingChannelName = useMemo(() => getSharingChannelName(sessionUuid), [sessionUuid])

  useEffect(() => {
    if (initialState?.sharingInfo) setSharingInfo(initialState.sharingInfo)
  }, [initialState])

  useEffect(() => {
    if (!isConnected || !isBootstrapped || !sessionUuid || !subscribeToChannel) {
      setIsReady(false)
      return
    }

    const unsubscribe = subscribeToChannel(sharingChannelName, {
      [SHARING_EVENTS.INFO]: (payload) => {
        setSharingInfo(payload as SharingInfo)
      },
      [SHARING_EVENTS.GET_INFO_CONFIRMED]: (payload) => {
        setSharingInfo(payload as SharingInfo)
      },
      [SHARING_EVENTS.ERROR]: (payload) => {
        console.error('[useSharing] Error:', payload)
      },
    })

    setIsReady(true)

    return () => {
      unsubscribe()
      setIsReady(false)
    }
  }, [isConnected, isBootstrapped, sessionUuid, sharingChannelName, subscribeToChannel])

  return { sharingInfo, isReady }
}
