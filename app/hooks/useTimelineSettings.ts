import { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { RoadmapTimelineSettings } from 'roadmaps-agents/schemas'
import { GENERAL_EVENTS, getGeneralChannelName } from 'roadmaps-agents/schemas'

import { SessionDetailContext } from '~/components/session/SessionDetailContext'

interface UseTimelineSettingsProps {
  sessionUuid: string
  initialSettings?: RoadmapTimelineSettings | null
}

export interface UseTimelineSettingsReturn {
  settings: RoadmapTimelineSettings | null
  isReady: boolean
}

/**
 * Hook for reading timeline settings. Updates are done via route action (fetcher).
 * Subscribes to general channel for real-time updates when other users change settings.
 */
export function useTimelineSettings({
  sessionUuid,
  initialSettings,
}: UseTimelineSettingsProps): UseTimelineSettingsReturn {
  const [settings, setSettings] = useState<RoadmapTimelineSettings | null>(
    initialSettings || null,
  )
  const [isReady, setIsReady] = useState(false)

  const context = useContext(SessionDetailContext)
  const isConnected = context?.isConnected ?? false
  const isBootstrapped = context?.isBootstrapped ?? false
  const subscribeToChannel = context?.subscribeToChannel

  const generalChannelName = useMemo(
    () => getGeneralChannelName(sessionUuid),
    [sessionUuid],
  )
  const initialState = context?.initialState

  useEffect(() => {
    if (initialState?.timelineSettings) {
      setSettings(initialState.timelineSettings)
    }
  }, [initialState])

  useEffect(() => {
    if (initialSettings) {
      setSettings(initialSettings)
    }
  }, [initialSettings])

  useEffect(() => {
    if (
      !isConnected ||
      !isBootstrapped ||
      !sessionUuid ||
      !subscribeToChannel
    ) {
      setIsReady(false)
      return
    }

    const unsubscribe = subscribeToChannel(generalChannelName, {
      [GENERAL_EVENTS.TIMELINE_SETTINGS_UPDATED]: (payload) => {
        const data = payload as RoadmapTimelineSettings
        setSettings(data)
      },
    })

    setIsReady(true)
    return () => {
      unsubscribe()
      setIsReady(false)
    }
  }, [
    isConnected,
    isBootstrapped,
    sessionUuid,
    generalChannelName,
    subscribeToChannel,
  ])

  return { settings, isReady }
}
