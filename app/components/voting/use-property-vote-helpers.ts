import { useCallback, useEffect, useState } from 'react'
import {
  type CompletePropertyStats,
  PROPERTY_VOTE_LABELS,
  PROPERTY_VOTE_VALUES,
  type PropertyVoteLabel,
  type PropertyVoteValue,
  type RoadmapItem,
  type VotingProperty,
} from 'roadmaps-agents/schemas'

import { calculateAlignmentScore } from '~/utils/alignment-scoring'

export type ConnectedUser = {
  username: string
  connectionId: string
  connectedAt: number
}

const PROPERTY_VOTE_OPTIONS: Array<{
  value: PropertyVoteValue
  label: PropertyVoteLabel
}> = [
  {
    value: PROPERTY_VOTE_VALUES.MINIMUM,
    label: PROPERTY_VOTE_LABELS[PROPERTY_VOTE_VALUES.MINIMUM],
  },
  {
    value: PROPERTY_VOTE_VALUES.LOW,
    label: PROPERTY_VOTE_LABELS[PROPERTY_VOTE_VALUES.LOW],
  },
  {
    value: PROPERTY_VOTE_VALUES.MEDIUM,
    label: PROPERTY_VOTE_LABELS[PROPERTY_VOTE_VALUES.MEDIUM],
  },
  {
    value: PROPERTY_VOTE_VALUES.HIGH,
    label: PROPERTY_VOTE_LABELS[PROPERTY_VOTE_VALUES.HIGH],
  },
  {
    value: PROPERTY_VOTE_VALUES.MAXIMUM,
    label: PROPERTY_VOTE_LABELS[PROPERTY_VOTE_VALUES.MAXIMUM],
  },
]

type UsePropertyVoteHelpersOptions = {
  votingProperties: VotingProperty[]
  userEmail: string
  isConnected: boolean
  connectedUsers: ConnectedUser[]
  completePropertyStats: Record<string, CompletePropertyStats>
  onPropertyVote: (params: {
    propertyUuid: string
    itemUuid: string
    value: number
  }) => void
  onGetCompletePropertyStats: (propertyUuid: string) => void
}

export function usePropertyVoteHelpers({
  votingProperties,
  userEmail,
  isConnected,
  connectedUsers,
  completePropertyStats,
  onPropertyVote,
  onGetCompletePropertyStats,
}: UsePropertyVoteHelpersOptions) {
  const [localVotes, setLocalVotes] = useState<
    Record<string, PropertyVoteValue>
  >({})

  useEffect(() => {
    if (isConnected && votingProperties.length > 0) {
      votingProperties.forEach((property) => {
        onGetCompletePropertyStats(property.uuid)
      })
    }
  }, [votingProperties, isConnected, onGetCompletePropertyStats])

  const getVoteKey = useCallback(
    (itemUuid: string, propertyUuid: string) => `${itemUuid}-${propertyUuid}`,
    [],
  )

  const getUserVoteForItemProperty = useCallback(
    (itemUuid: string, propertyUuid: string): PropertyVoteValue | null => {
      const propertyStats = completePropertyStats[propertyUuid]
      if (!propertyStats) return null

      const itemStats = propertyStats.itemStats.find(
        (stat) => stat.itemUuid === itemUuid,
      )

      if (itemStats?.userVote) {
        return itemStats.userVote.value as PropertyVoteValue
      }

      if (itemStats?.votes) {
        const userVote = itemStats.votes.find(
          (vote) => vote.username === userEmail,
        )
        return userVote ? (userVote.value as PropertyVoteValue) : null
      }

      return null
    },
    [completePropertyStats, userEmail],
  )

  const hasUserVoted = useCallback(
    (itemUuid: string, propertyUuid: string): boolean => {
      const propertyStats = completePropertyStats[propertyUuid]
      if (!propertyStats) return false

      const itemStats = propertyStats.itemStats.find(
        (stat) => stat.itemUuid === itemUuid,
      )

      if (itemStats?.userVote) return true

      if (itemStats?.votes) {
        const userVote = itemStats.votes.find(
          (vote) => vote.username === userEmail,
        )
        return !!userVote
      }

      return false
    },
    [completePropertyStats, userEmail],
  )

  const getEffectiveVoteForItemProperty = useCallback(
    (itemUuid: string, propertyUuid: string): PropertyVoteValue | null => {
      const voteKey = getVoteKey(itemUuid, propertyUuid)
      const localVote = localVotes[voteKey]
      if (localVote !== undefined) return localVote

      return getUserVoteForItemProperty(itemUuid, propertyUuid)
    },
    [getVoteKey, localVotes, getUserVoteForItemProperty],
  )

  const getItemPropertyStats = useCallback(
    (itemUuid: string, propertyUuid: string) => {
      const propertyStats = completePropertyStats[propertyUuid]
      if (!propertyStats) return null

      return propertyStats.itemStats.find((stat) => stat.itemUuid === itemUuid)
    },
    [completePropertyStats],
  )

  const getAlignmentScore = useCallback(
    (itemUuid: string, propertyUuid: string) => {
      const itemStats = getItemPropertyStats(itemUuid, propertyUuid)
      if (!itemStats || itemStats.votes.length === 0) return null

      return calculateAlignmentScore({ votes: itemStats.votes })
    },
    [getItemPropertyStats],
  )

  const canChangeVote = useCallback(
    (itemUuid: string, propertyUuid: string): boolean => {
      const userHasVoted = hasUserVoted(itemUuid, propertyUuid)
      if (!userHasVoted) return true

      const itemStats = getItemPropertyStats(itemUuid, propertyUuid)
      const otherVoters =
        itemStats?.votes
          .map((vote) => vote.username)
          .filter((username) => username !== userEmail) || []

      if (otherVoters.length === 0) return true

      const connectedUsernames = connectedUsers.map((user) => user.username)
      return otherVoters.every((voter) => connectedUsernames.includes(voter))
    },
    [hasUserVoted, getItemPropertyStats, userEmail, connectedUsers],
  )

  const getVoteChangeRestrictionReason = useCallback(
    (itemUuid: string, propertyUuid: string): string | null => {
      if (canChangeVote(itemUuid, propertyUuid)) return null

      const itemStats = getItemPropertyStats(itemUuid, propertyUuid)
      const otherVoters =
        itemStats?.votes
          .map((vote) => vote.username)
          .filter((username) => username !== userEmail) || []

      const connectedUsernames = connectedUsers.map((user) => user.username)
      const offlineVoters = otherVoters.filter(
        (voter) => !connectedUsernames.includes(voter),
      )

      if (offlineVoters.length === 1) {
        return `Can't change vote while ${offlineVoters[0]} is offline`
      }
      if (offlineVoters.length > 1) {
        return `Can't change vote while ${offlineVoters.length} other voters are offline`
      }

      return "Can't change vote at this time"
    },
    [canChangeVote, getItemPropertyStats, userEmail, connectedUsers],
  )

  const handlePropertyVote = useCallback(
    (itemUuid: string, propertyUuid: string, value: PropertyVoteValue) => {
      onPropertyVote({
        propertyUuid,
        itemUuid,
        value,
      })

      const voteKey = getVoteKey(itemUuid, propertyUuid)
      setLocalVotes((prev) => {
        const newLocalVotes = { ...prev }
        delete newLocalVotes[voteKey]
        return newLocalVotes
      })
    },
    [getVoteKey, onPropertyVote],
  )

  const setOptimisticVote = useCallback(
    (itemUuid: string, propertyUuid: string, value: PropertyVoteValue) => {
      const voteKey = getVoteKey(itemUuid, propertyUuid)
      setLocalVotes((prev) => ({ ...prev, [voteKey]: value }))
    },
    [getVoteKey],
  )

  const clearOptimisticVote = useCallback(
    (itemUuid: string, propertyUuid: string) => {
      const voteKey = getVoteKey(itemUuid, propertyUuid)
      setLocalVotes((prev) => {
        const newLocalVotes = { ...prev }
        delete newLocalVotes[voteKey]
        return newLocalVotes
      })
    },
    [getVoteKey],
  )

  return {
    voteOptions: PROPERTY_VOTE_OPTIONS,
    getVoteKey,
    getEffectiveVoteForItemProperty,
    hasUserVoted,
    getItemPropertyStats,
    getAlignmentScore,
    canChangeVote,
    getVoteChangeRestrictionReason,
    handlePropertyVote,
    setOptimisticVote,
    clearOptimisticVote,
  }
}
