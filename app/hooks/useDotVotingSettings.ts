import { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  DOT_VOTING_SETTINGS_ACTIONS,
  DOT_VOTING_SETTINGS_EVENTS,
  DotVotingSettings,
  GENERAL_EVENTS,
  getDotVotingSettingsChannelName,
  getGeneralChannelName,
} from 'roadmaps-agents/schemas'

import { SessionDetailContext } from '~/components/session/SessionDetailContext'

interface UseDotVotingSettingsProps {
  sessionUuid: string
  initialSettings?: DotVotingSettings | null
}

export interface UseDotVotingSettingsReturn {
  settings: DotVotingSettings | null
  updateSettings: (dotsPerVoter: number) => void
  resetVotes: () => void
  isReady: boolean
}

/**
 * Custom hook for managing dot voting settings using channel-based messaging
 *
 * This hook manages dot voting configuration settings such as the number of dots
 * each voter receives. Only the roadmap owner can modify these settings.
 */
export function useDotVotingSettings({
  sessionUuid,
  initialSettings,
}: UseDotVotingSettingsProps): UseDotVotingSettingsReturn {
  const [settings, setSettings] = useState<DotVotingSettings | null>(
    initialSettings || null,
  )
  const [isReady, setIsReady] = useState(false)

  // Get channel methods from context
  const context = useContext(SessionDetailContext)
  const isConnected = context?.isConnected ?? false
  const isBootstrapped = context?.isBootstrapped ?? false
  const subscribeToChannel = context?.subscribeToChannel
  const publishToChannel = context?.publishToChannel

  // Memoize channel names
  const dotVotingSettingsChannelName = useMemo(
    () => getDotVotingSettingsChannelName(sessionUuid),
    [sessionUuid],
  )
  const generalChannelName = useMemo(
    () => getGeneralChannelName(sessionUuid),
    [sessionUuid],
  )
  const initialState = context?.initialState

  useEffect(() => {
    const settings = initialState?.dotVotingSettings
    if (settings) setSettings(settings)
  }, [initialState])

  // Subscribe to dot voting settings channel when connected
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

    const unsubscribe = subscribeToChannel(dotVotingSettingsChannelName, {
      // Stream: Updated settings
      [DOT_VOTING_SETTINGS_EVENTS.SETTINGS]: (payload) => {
        const data = payload as DotVotingSettings
        setSettings(data)
      },

      // Response: Get settings confirmed
      [DOT_VOTING_SETTINGS_EVENTS.GET_SETTINGS_CONFIRMED]: (payload) => {
        const data = payload as DotVotingSettings
        setSettings(data)
      },

      // Response: Set settings confirmed
      [DOT_VOTING_SETTINGS_EVENTS.SET_SETTINGS_CONFIRMED]: (payload) => {
        console.log('[useDotVotingSettings] Set settings confirmed:', payload)
        // Settings will be updated via the 'settings' stream
      },

      // Response: Reset votes confirmed
      [DOT_VOTING_SETTINGS_EVENTS.RESET_VOTES_CONFIRMED]: (payload) => {
        console.log('[useDotVotingSettings] Reset votes confirmed:', payload)
      },

      // Error handling
      [DOT_VOTING_SETTINGS_EVENTS.ERROR]: (payload) => {
        console.error('[useDotVotingSettings] Error:', payload)
      },
    })

    setIsReady(true)

    // Cleanup subscription on unmount or when dependencies change
    return () => {
      unsubscribe()
      setIsReady(false)
    }
  }, [
    isConnected,
    isBootstrapped,
    dotVotingSettingsChannelName,
    subscribeToChannel,
  ])

  // Also subscribe to general channel for settings updates (accessible to dot voters)
  useEffect(() => {
    if (
      !isConnected ||
      !isBootstrapped ||
      !sessionUuid ||
      !subscribeToChannel
    ) {
      return
    }

    const unsubscribe = subscribeToChannel(generalChannelName, {
      // Stream: Dot voting settings updated (broadcast to all users including dot voters)
      [GENERAL_EVENTS.DOT_VOTING_SETTINGS_UPDATED]: (payload) => {
        const data = payload as DotVotingSettings
        setSettings(data)
      },
    })

    // Cleanup subscription on unmount or when dependencies change
    return () => {
      unsubscribe()
    }
  }, [isConnected, isBootstrapped, generalChannelName, subscribeToChannel])

  // Settings actions
  const updateSettings = useCallback(
    (dotsPerVoter: number) => {
      if (!isReady || !publishToChannel) return
      publishToChannel(
        dotVotingSettingsChannelName,
        DOT_VOTING_SETTINGS_ACTIONS.SET_SETTINGS,
        {
          dotsPerVoter,
        },
      )
    },
    [publishToChannel, dotVotingSettingsChannelName, isReady],
  )

  const resetVotes = useCallback(() => {
    if (!isReady || !publishToChannel) return
    publishToChannel(
      dotVotingSettingsChannelName,
      DOT_VOTING_SETTINGS_ACTIONS.RESET_VOTES,
      {},
    )
  }, [publishToChannel, dotVotingSettingsChannelName, isReady])

  return {
    settings,
    updateSettings,
    resetVotes,
    isReady,
  }
}
