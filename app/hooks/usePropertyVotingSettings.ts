import { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  DEFAULT_REQUIRE_ALL_VOTERS_PRESENT,
  GENERAL_EVENTS,
  getGeneralChannelName,
  getPropertyVotingSettingsChannelName,
  PROPERTY_VOTING_SETTINGS_ACTIONS,
  PROPERTY_VOTING_SETTINGS_EVENTS,
  type PropertyVotingSettings,
} from 'roadmaps-agents/schemas'

import { SessionDetailContext } from '~/components/session/SessionDetailContext'

type UsePropertyVotingSettingsProps = {
  sessionUuid: string
  initialSettings?: PropertyVotingSettings | null
}

export type UsePropertyVotingSettingsReturn = {
  settings: PropertyVotingSettings
  updateSettings: (requireAllVotersPresent: boolean) => void
  isReady: boolean
}

export function usePropertyVotingSettings({
  sessionUuid,
  initialSettings,
}: UsePropertyVotingSettingsProps): UsePropertyVotingSettingsReturn {
  const [settings, setSettings] = useState<PropertyVotingSettings>(
    initialSettings ?? { requireAllVotersPresent: DEFAULT_REQUIRE_ALL_VOTERS_PRESENT },
  )
  const [isReady, setIsReady] = useState(false)

  const context = useContext(SessionDetailContext)
  const isConnected = context?.isConnected ?? false
  const isBootstrapped = context?.isBootstrapped ?? false
  const subscribeToChannel = context?.subscribeToChannel
  const publishToChannel = context?.publishToChannel
  const initialState = context?.initialState

  const settingsChannelName = useMemo(() => getPropertyVotingSettingsChannelName(sessionUuid), [sessionUuid])
  const generalChannelName = useMemo(() => getGeneralChannelName(sessionUuid), [sessionUuid])

  useEffect(() => {
    const propertyVotingSettings = initialState?.propertyVotingSettings
    if (propertyVotingSettings) setSettings(propertyVotingSettings)
  }, [initialState])

  useEffect(() => {
    if (!isConnected || !isBootstrapped || !sessionUuid || !subscribeToChannel) {
      setIsReady(false)
      return
    }

    const unsubscribe = subscribeToChannel(settingsChannelName, {
      [PROPERTY_VOTING_SETTINGS_EVENTS.SETTINGS]: (payload) => {
        setSettings(payload as PropertyVotingSettings)
      },
      [PROPERTY_VOTING_SETTINGS_EVENTS.GET_SETTINGS_CONFIRMED]: (payload) => {
        setSettings(payload as PropertyVotingSettings)
      },
      [PROPERTY_VOTING_SETTINGS_EVENTS.ERROR]: (payload) => {
        console.error('[usePropertyVotingSettings] Error:', payload)
      },
    })

    setIsReady(true)
    return () => {
      unsubscribe()
      setIsReady(false)
    }
  }, [isConnected, isBootstrapped, settingsChannelName, subscribeToChannel, sessionUuid])

  useEffect(() => {
    if (!isConnected || !isBootstrapped || !sessionUuid || !subscribeToChannel) return

    const unsubscribe = subscribeToChannel(generalChannelName, {
      [GENERAL_EVENTS.PROPERTY_VOTING_SETTINGS_UPDATED]: (payload) => {
        setSettings(payload as PropertyVotingSettings)
      },
    })

    return unsubscribe
  }, [isConnected, isBootstrapped, generalChannelName, subscribeToChannel, sessionUuid])

  const updateSettings = useCallback(
    (requireAllVotersPresent: boolean) => {
      if (!isReady || !publishToChannel) return
      publishToChannel(settingsChannelName, PROPERTY_VOTING_SETTINGS_ACTIONS.SET_SETTINGS, {
        requireAllVotersPresent,
      })
    },
    [publishToChannel, settingsChannelName, isReady],
  )

  return {
    settings,
    updateSettings,
    isReady,
  }
}
