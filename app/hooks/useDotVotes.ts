import { useCallback, useEffect, useState } from 'react'
import type { CompleteDotStats, DotVoteStats } from 'roadmaps-agents/schemas'
import {
  type CastDotVote,
  DOT_VOTES_ACTIONS,
  DOT_VOTES_EVENTS,
  getDotVotesChannelName,
} from 'roadmaps-agents/schemas'

import { useSessionDetail } from '~/components/session/SessionDetailContext'

interface UseDotVotesProps {
  sessionUuid: string
  userEmail: string
  initialStats?: CompleteDotStats
}

export interface UseDotVotesReturn {
  dotVoteStats: Record<string, DotVoteStats>
  completeDotStats: CompleteDotStats | null
  castDotVote: (data: CastDotVote) => void
  removeDotVote: (data: { itemUuid: string; dotPositionX: number; dotPositionY: number }) => void
  getCompleteDotStats: () => void
  isReady: boolean
}

export function useDotVotes({ sessionUuid, userEmail, initialStats }: UseDotVotesProps): UseDotVotesReturn {
  const { isConnected, isBootstrapped, subscribeToChannel, publishToChannel } = useSessionDetail()
  const [isReady, setIsReady] = useState(false)
  const [dotVoteStats, setDotVoteStats] = useState<Record<string, DotVoteStats>>({})
  const [completeDotStats, setCompleteDotStats] = useState<CompleteDotStats | null>(initialStats || null)

  const dotVotesChannelName = getDotVotesChannelName(sessionUuid)

  // Update state when initialStats changes (from WebSocket initial state)
  if (initialStats && !completeDotStats) {
    setCompleteDotStats(initialStats)
  }

  useEffect(() => {
    if (!isConnected || !isBootstrapped || !sessionUuid || !subscribeToChannel) {
      setIsReady(false)
      return
    }

    const unsubscribe = subscribeToChannel(dotVotesChannelName, {
      [DOT_VOTES_EVENTS.CAST_CONFIRMED]: () => {
        // Vote cast confirmed - stats will be broadcast
      },

      [DOT_VOTES_EVENTS.REMOVE_CONFIRMED]: () => {
        // Vote removal confirmed - stats will be broadcast
      },

      [DOT_VOTES_EVENTS.STATS]: (payload) => {
        const data = payload as { stats: DotVoteStats }
        setDotVoteStats((prev) => ({
          ...prev,
          [data.stats.itemUuid]: data.stats,
        }))
      },

      [DOT_VOTES_EVENTS.COMPLETE_STATS]: (payload) => {
        const data = payload as { stats: CompleteDotStats }
        setCompleteDotStats(data.stats)
      },

      [DOT_VOTES_EVENTS.ERROR]: (payload) => {
        console.error('[useDotVotes] Error:', payload)
      },
    })

    setIsReady(true)

    return () => {
      unsubscribe()
      setIsReady(false)
    }
  }, [isConnected, isBootstrapped, dotVotesChannelName, subscribeToChannel])

  const castDotVote = useCallback(
    (data: CastDotVote) => {
      if (!isReady || !publishToChannel) return
      publishToChannel(dotVotesChannelName, DOT_VOTES_ACTIONS.CAST, data)
    },
    [publishToChannel, dotVotesChannelName, isReady],
  )

  const removeDotVote = useCallback(
    (data: { itemUuid: string; dotPositionX: number; dotPositionY: number }) => {
      if (!isReady || !publishToChannel) return
      publishToChannel(dotVotesChannelName, DOT_VOTES_ACTIONS.REMOVE, data)
    },
    [publishToChannel, dotVotesChannelName, isReady],
  )

  const getCompleteDotStats = useCallback(() => {
    if (!isReady || !publishToChannel) return
    publishToChannel(dotVotesChannelName, DOT_VOTES_ACTIONS.GET_COMPLETE_STATS, {})
  }, [publishToChannel, dotVotesChannelName, isReady])

  return {
    dotVoteStats,
    completeDotStats,
    castDotVote,
    removeDotVote,
    getCompleteDotStats,
    isReady,
  }
}
