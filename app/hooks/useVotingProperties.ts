import { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  createVotingPropertySchema,
  getVotingPropertiesChannelName,
  updateVotingPropertySchema,
  VOTING_PROPERTIES_ACTIONS,
  VOTING_PROPERTIES_EVENTS,
  VotingProperty,
} from 'roadmaps-agents/schemas'
import type { z } from 'zod'

import { SessionDetailContext } from '~/components/session/SessionDetailContext'

type CreateVotingProperty = z.infer<typeof createVotingPropertySchema>
type UpdateVotingProperty = z.infer<typeof updateVotingPropertySchema>

interface UseVotingPropertiesProps {
  sessionUuid: string
  userEmail: string
  initialVotingProperties: VotingProperty[]
}

export interface UseVotingPropertiesReturn {
  votingProperties: VotingProperty[]
  createVotingProperty: (data: CreateVotingProperty) => void
  updateVotingProperty: (data: UpdateVotingProperty) => void
  deleteVotingProperty: (propertyUuid: string) => void
  reorderVotingProperties: (propertyOrders: { uuid: string; displayOrder: number }[]) => void
  refreshVotingProperties: () => void
  isReady: boolean
}

/**
 * Custom hook for managing voting properties using channel-based messaging
 */
export function useVotingProperties({
  sessionUuid,
  userEmail,
  initialVotingProperties,
}: UseVotingPropertiesProps): UseVotingPropertiesReturn {
  const [votingProperties, setVotingProperties] = useState<VotingProperty[]>(initialVotingProperties)
  const [isReady, setIsReady] = useState(false)

  const context = useContext(SessionDetailContext)
  const isConnected = context?.isConnected ?? false
  const isBootstrapped = context?.isBootstrapped ?? false
  const subscribeToChannel = context?.subscribeToChannel
  const publishToChannel = context?.publishToChannel
  const initialState = context?.initialState

  const votingPropertiesChannelName = useMemo(() => getVotingPropertiesChannelName(sessionUuid), [sessionUuid])

  useEffect(() => {
    if (!isConnected || !isBootstrapped || !sessionUuid || !subscribeToChannel) {
      setIsReady(false)
      return
    }

    const unsubscribe = subscribeToChannel(votingPropertiesChannelName, {
      [VOTING_PROPERTIES_EVENTS.CREATED]: (payload) => {
        const data = payload as { property: VotingProperty }
        setVotingProperties((prev) => [...prev, data.property])
      },

      [VOTING_PROPERTIES_EVENTS.UPDATED]: (payload) => {
        const data = payload as { property: VotingProperty }
        setVotingProperties((prev) =>
          prev.map((property) => (property.uuid === data.property.uuid ? data.property : property)),
        )
      },

      [VOTING_PROPERTIES_EVENTS.DELETED]: (payload) => {
        const data = payload as { propertyUuid: string }
        setVotingProperties((prev) => prev.filter((property) => property.uuid !== data.propertyUuid))
      },

      [VOTING_PROPERTIES_EVENTS.REORDERED]: (payload) => {
        const data = payload as { properties: VotingProperty[] }
        setVotingProperties(data.properties)
      },

      [VOTING_PROPERTIES_EVENTS.ALL_PROPERTIES]: (payload) => {
        const data = payload as { properties: VotingProperty[] }
        setVotingProperties(data.properties)
      },

      [VOTING_PROPERTIES_EVENTS.ERROR]: (payload) => {
        console.error('[useVotingProperties] Error:', payload)
      },
    })

    setIsReady(true)

    return () => {
      unsubscribe()
      setIsReady(false)
    }
  }, [isConnected, isBootstrapped, votingPropertiesChannelName, subscribeToChannel])

  const createVotingProperty = useCallback(
    (data: CreateVotingProperty) => {
      if (!isReady || !publishToChannel) return
      publishToChannel(votingPropertiesChannelName, VOTING_PROPERTIES_ACTIONS.CREATE, data)
    },
    [publishToChannel, votingPropertiesChannelName, isReady],
  )

  const updateVotingProperty = useCallback(
    (data: UpdateVotingProperty) => {
      if (!isReady || !publishToChannel) return
      publishToChannel(votingPropertiesChannelName, VOTING_PROPERTIES_ACTIONS.UPDATE, data)
    },
    [publishToChannel, votingPropertiesChannelName, isReady],
  )

  const deleteVotingProperty = useCallback(
    (propertyUuid: string) => {
      if (!isReady || !publishToChannel) return
      publishToChannel(votingPropertiesChannelName, VOTING_PROPERTIES_ACTIONS.DELETE, {
        propertyUuid,
      })
    },
    [publishToChannel, votingPropertiesChannelName, isReady],
  )

  const reorderVotingProperties = useCallback(
    (propertyOrders: { uuid: string; displayOrder: number }[]) => {
      if (!isReady || !publishToChannel) return
      publishToChannel(votingPropertiesChannelName, VOTING_PROPERTIES_ACTIONS.REORDER, { propertyOrders })
    },
    [publishToChannel, votingPropertiesChannelName, isReady],
  )

  const refreshVotingProperties = useCallback(() => {
    if (!isReady || !publishToChannel) return
    publishToChannel(votingPropertiesChannelName, VOTING_PROPERTIES_ACTIONS.GET_ALL, {})
  }, [publishToChannel, votingPropertiesChannelName, isReady])

  // Update voting properties when initial state is received (e.g. on reconnect)
  useEffect(() => {
    const properties = (
      initialState as {
        votingProperties?: { properties: VotingProperty[] }
      } | null
    )?.votingProperties?.properties
    if (properties) setVotingProperties(properties)
  }, [initialState])

  return {
    votingProperties,
    createVotingProperty,
    updateVotingProperty,
    deleteVotingProperty,
    reorderVotingProperties,
    refreshVotingProperties,
    isReady,
  }
}
