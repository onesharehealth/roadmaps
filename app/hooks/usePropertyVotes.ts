import { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  CastPropertyVote,
  CompletePropertyStats,
  getPropertyVotesChannelName,
  PROPERTY_VOTES_ACTIONS,
  PROPERTY_VOTES_EVENTS,
  PropertyVoteStats,
} from 'roadmaps-agents/schemas'

import { SessionDetailContext } from '~/components/session/SessionDetailContext'

interface UsePropertyVotesProps {
  sessionUuid: string
}

export interface UsePropertyVotesReturn {
  castPropertyVote: (data: CastPropertyVote) => void
  removePropertyVote: (propertyUuid: string, itemUuid: string) => void
  getPropertyVoteStats: (propertyUuid: string, itemUuid: string) => void
  getCompletePropertyStats: (propertyUuid: string) => void
  propertyVoteStats: Record<string, Record<string, PropertyVoteStats>>
  completePropertyStats: Record<string, CompletePropertyStats>
  isReady: boolean
}

export function usePropertyVotes({ sessionUuid }: UsePropertyVotesProps): UsePropertyVotesReturn {
  const [propertyVoteStats, setPropertyVoteStats] = useState<Record<string, Record<string, PropertyVoteStats>>>(
    {},
  )
  const [completePropertyStats, setCompletePropertyStats] = useState<Record<string, CompletePropertyStats>>({})
  const [isReady, setIsReady] = useState(false)

  const context = useContext(SessionDetailContext)
  const isConnected = context?.isConnected ?? false
  const isBootstrapped = context?.isBootstrapped ?? false
  const subscribeToChannel = context?.subscribeToChannel
  const publishToChannel = context?.publishToChannel
  const initialState = context?.initialState

  const propertyVotesChannelName = useMemo(() => getPropertyVotesChannelName(sessionUuid), [sessionUuid])

  useEffect(() => {
    const stats = initialState?.completePropertyStats
    if (stats) setCompletePropertyStats(stats)
  }, [initialState])

  useEffect(() => {
    if (!isConnected || !isBootstrapped || !sessionUuid || !subscribeToChannel) {
      setIsReady(false)
      return
    }

    const unsubscribe = subscribeToChannel(propertyVotesChannelName, {
      [PROPERTY_VOTES_EVENTS.CAST_CONFIRMED]: () => {},

      [PROPERTY_VOTES_EVENTS.REMOVE_CONFIRMED]: () => {},

      [PROPERTY_VOTES_EVENTS.STATS]: (payload) => {
        const data = payload as { stats: PropertyVoteStats }
        setPropertyVoteStats((prev) => ({
          ...prev,
          [data.stats.propertyUuid]: {
            ...(prev[data.stats.propertyUuid] || {}),
            [data.stats.itemUuid]: data.stats,
          },
        }))

        if (publishToChannel) {
          publishToChannel(propertyVotesChannelName, PROPERTY_VOTES_ACTIONS.GET_COMPLETE_STATS, {
            propertyUuid: data.stats.propertyUuid,
          })
        }
      },

      [PROPERTY_VOTES_EVENTS.COMPLETE_STATS]: (payload) => {
        const data = payload as { stats: CompletePropertyStats }
        setCompletePropertyStats((prev) => ({
          ...prev,
          [data.stats.propertyUuid]: data.stats,
        }))
      },

      [PROPERTY_VOTES_EVENTS.ERROR]: (payload) => {
        console.error('[usePropertyVotes] Error:', payload)
      },
    })

    setIsReady(true)

    return () => {
      unsubscribe()
      setIsReady(false)
    }
  }, [isConnected, isBootstrapped, propertyVotesChannelName, subscribeToChannel, publishToChannel])

  const castPropertyVote = useCallback(
    (data: CastPropertyVote) => {
      if (!isReady || !publishToChannel) return
      publishToChannel(propertyVotesChannelName, PROPERTY_VOTES_ACTIONS.CAST, data)
    },
    [publishToChannel, propertyVotesChannelName, isReady],
  )

  const removePropertyVote = useCallback(
    (propertyUuid: string, itemUuid: string) => {
      if (!isReady || !publishToChannel) return
      publishToChannel(propertyVotesChannelName, PROPERTY_VOTES_ACTIONS.REMOVE, {
        propertyUuid,
        itemUuid,
      })
    },
    [publishToChannel, propertyVotesChannelName, isReady],
  )

  const getPropertyVoteStats = useCallback(
    (propertyUuid: string, itemUuid: string) => {
      if (!isReady || !publishToChannel) return
      publishToChannel(propertyVotesChannelName, PROPERTY_VOTES_ACTIONS.GET_STATS, {
        propertyUuid,
        itemUuid,
      })
    },
    [publishToChannel, propertyVotesChannelName, isReady],
  )

  const getCompletePropertyStats = useCallback(
    (propertyUuid: string) => {
      if (!isReady || !publishToChannel) return
      publishToChannel(propertyVotesChannelName, PROPERTY_VOTES_ACTIONS.GET_COMPLETE_STATS, {
        propertyUuid,
      })
    },
    [publishToChannel, propertyVotesChannelName, isReady],
  )

  return {
    castPropertyVote,
    removePropertyVote,
    getPropertyVoteStats,
    getCompletePropertyStats,
    propertyVoteStats,
    completePropertyStats,
    isReady,
  }
}
