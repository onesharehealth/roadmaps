import { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  getItemsChannelName,
  getTimelineChannelName,
  ITEMS_EVENTS,
  ROADMAP_STATUS,
  ROADMAP_TIMELINE_ACTIONS,
  ROADMAP_TIMELINE_EVENTS,
  RoadmapItem,
  RoadmapStatus,
} from 'roadmaps-agents/schemas'

import { SessionDetailContext } from '~/components/session/SessionDetailContext'

interface RoadmapTimelineHookProps {
  sessionUuid: string
  userEmail: string
  initialItems: RoadmapItem[]
}

export interface RoadmapTimelineHookReturn {
  itemsByStatus: Record<RoadmapStatus, RoadmapItem[]>
  setItemStatus: (params: { itemUuid: string; status: RoadmapStatus; roadmapOrder?: number }) => void
  reorderTimelineItems: (params: { itemOrders: { uuid: string; roadmapOrder: number }[] }) => void
  refreshTimeline: () => void
  isReady: boolean
}

export function useRoadmapZones({
  sessionUuid,
  userEmail,
  initialItems,
}: RoadmapTimelineHookProps): RoadmapTimelineHookReturn {
  // Helper to sort all status groups by roadmapOrder
  const sortAllStatusGroups = useCallback((itemsByStatus: Record<RoadmapStatus, RoadmapItem[]>) => {
    itemsByStatus.unaddressed.sort((a, b) => (a.roadmapOrder ?? 0) - (b.roadmapOrder ?? 0))
    itemsByStatus.assigned.sort((a, b) => (a.roadmapOrder ?? 0) - (b.roadmapOrder ?? 0))
    itemsByStatus.completed.sort((a, b) => (a.roadmapOrder ?? 0) - (b.roadmapOrder ?? 0))
  }, [])

  // Group initial items by status
  const groupItemsByStatus = useCallback(
    (items: RoadmapItem[]): Record<RoadmapStatus, RoadmapItem[]> => {
      const grouped: Record<RoadmapStatus, RoadmapItem[]> = {
        unaddressed: [],
        assigned: [],
        completed: [],
      }

      for (const item of items) {
        grouped[item.roadmapStatus].push(item)
      }

      sortAllStatusGroups(grouped)
      return grouped
    },
    [sortAllStatusGroups],
  )

  const [itemsByStatus, setItemsByStatus] = useState<Record<RoadmapStatus, RoadmapItem[]>>(
    groupItemsByStatus(initialItems),
  )
  const [isReady, setIsReady] = useState(false)

  const context = useContext(SessionDetailContext)
  const isConnected = context?.isConnected ?? false
  const isBootstrapped = context?.isBootstrapped ?? false
  const subscribeToChannel = context?.subscribeToChannel
  const publishToChannel = context?.publishToChannel
  const initialState = context?.initialState

  const roadmapTimelineChannelName = useMemo(() => getTimelineChannelName(sessionUuid), [sessionUuid])
  const itemsChannelName = useMemo(() => getItemsChannelName(sessionUuid), [sessionUuid])

  useEffect(() => {
    if (!isConnected || !isBootstrapped || !sessionUuid || !subscribeToChannel) {
      setIsReady(false)
      return
    }

    console.log('[useRoadmapZones] Subscribing to channel:', roadmapTimelineChannelName)

    const unsubscribe = subscribeToChannel(roadmapTimelineChannelName, {
      [ROADMAP_TIMELINE_EVENTS.STATUS_UPDATED]: (payload) => {
        const { item, status } = payload as {
          item: RoadmapItem
          status: RoadmapStatus
        }

        console.log('[useRoadmapZones] STATUS_UPDATED:', {
          itemUuid: item.uuid,
          itemTitle: item.title,
          newStatus: status,
          item,
        })

        setItemsByStatus((prev) => {
          const updated = { ...prev }

          // Remove item from all statuses
          for (const s in updated) {
            updated[s as RoadmapStatus] = updated[s as RoadmapStatus].filter((i) => i.uuid !== item.uuid)
          }

          // Add item to new status
          updated[status] = [...updated[status], item]
          sortAllStatusGroups(updated)

          console.log('[useRoadmapZones] Updated state:', {
            unaddressedCount: updated.unaddressed.length,
            assignedCount: updated.assigned.length,
            completedCount: updated.completed.length,
          })

          return updated
        })
      },
      [ROADMAP_TIMELINE_EVENTS.TIMELINE_REORDERED]: (payload) => {
        const { items } = payload as { items: RoadmapItem[] }

        setItemsByStatus((prev) => ({
          ...prev,
          assigned: items.sort((a, b) => (a.roadmapOrder ?? 0) - (b.roadmapOrder ?? 0)),
        }))
      },
      [ROADMAP_TIMELINE_EVENTS.TIMELINE_ITEMS]: (payload) => {
        const { itemsByStatus: fetchedItemsByStatus } = payload as {
          itemsByStatus: Record<RoadmapStatus, RoadmapItem[]>
        }
        setItemsByStatus(fetchedItemsByStatus)
        setIsReady(true)
      },
      [ROADMAP_TIMELINE_EVENTS.ERROR]: (payload) => {
        console.error('Roadmap timeline error:', payload)
      },
    })

    // Update items by status when initial state is received (e.g. on reconnect)
    if (initialState?.items?.items) {
      setItemsByStatus(groupItemsByStatus(initialState.items.items))
      setIsReady(true)
    }

    return () => {
      unsubscribe()
    }
  }, [
    isConnected,
    isBootstrapped,
    sessionUuid,
    subscribeToChannel,
    publishToChannel,
    roadmapTimelineChannelName,
    initialState, // Added dependency
    groupItemsByStatus, // Added dependency
  ]) // Removed unsubscribeFromChannel dependency

  // Helper to add or update an item in the correct status group
  const upsertItem = useCallback(
    (item: RoadmapItem) => {
      setItemsByStatus((prev) => {
        const updated = { ...prev }

        // Remove item from all statuses (in case it moved)
        for (const s in updated) {
          updated[s as RoadmapStatus] = updated[s as RoadmapStatus].filter((i) => i.uuid !== item.uuid)
        }

        // Add item to its status
        updated[item.roadmapStatus] = [...updated[item.roadmapStatus], item]
        sortAllStatusGroups(updated)

        return updated
      })
    },
    [sortAllStatusGroups],
  )

  // Helper to remove an item from all status groups
  const removeItem = useCallback((itemUuid: string) => {
    setItemsByStatus((prev) => {
      const updated = { ...prev }

      for (const s in updated) {
        updated[s as RoadmapStatus] = updated[s as RoadmapStatus].filter((i) => i.uuid !== itemUuid)
      }

      return updated
    })
  }, [])

  // Subscribe to items channel to get notified of new/updated/deleted items
  useEffect(() => {
    if (!isConnected || !isBootstrapped || !sessionUuid || !subscribeToChannel) {
      return
    }

    console.log('[useRoadmapZones] Subscribing to items channel:', itemsChannelName)

    const unsubscribe = subscribeToChannel(itemsChannelName, {
      [ITEMS_EVENTS.CREATED]: (payload) => {
        const { item } = payload as { item: RoadmapItem }
        console.log('[useRoadmapZones] ITEM_CREATED:', item)
        upsertItem(item)
      },
      [ITEMS_EVENTS.UPDATED]: (payload) => {
        const { item } = payload as { item: RoadmapItem }
        console.log('[useRoadmapZones] ITEM_UPDATED:', item)
        upsertItem(item)
      },
      [ITEMS_EVENTS.DELETED]: (payload) => {
        const { itemUuid } = payload as { itemUuid: string }
        console.log('[useRoadmapZones] ITEM_DELETED:', itemUuid)
        removeItem(itemUuid)
      },
    })

    return () => {
      unsubscribe()
    }
  }, [isConnected, isBootstrapped, sessionUuid, subscribeToChannel, itemsChannelName, upsertItem, removeItem]) // Removed unsubscribeFromChannel dependency

  const setItemStatus = useCallback(
    (params: { itemUuid: string; status: RoadmapStatus; roadmapOrder?: number }) => {
      if (!publishToChannel) return
      console.log('[useRoadmapZones] setItemStatus called:', params)
      publishToChannel(roadmapTimelineChannelName, ROADMAP_TIMELINE_ACTIONS.SET_STATUS, {
        ...params,
      })
    },
    [publishToChannel, roadmapTimelineChannelName],
  )

  const reorderTimelineItems = useCallback(
    (params: {
      itemOrders: { uuid: string; roadmapOrder: number }[]
      optimisticItemsByStatus?: Record<RoadmapStatus, RoadmapItem[]>
    }) => {
      if (!publishToChannel) return
      // Optimistic update for snappier UX when reordering within unaddressed/completed
      if (params.optimisticItemsByStatus) {
        setItemsByStatus(params.optimisticItemsByStatus)
      }
      publishToChannel(roadmapTimelineChannelName, ROADMAP_TIMELINE_ACTIONS.REORDER_TIMELINE, {
        itemOrders: params.itemOrders,
      })
    },
    [publishToChannel, roadmapTimelineChannelName],
  )

  const refreshTimeline = useCallback(() => {
    if (!publishToChannel) return
    publishToChannel(roadmapTimelineChannelName, ROADMAP_TIMELINE_ACTIONS.GET_TIMELINE_ITEMS, {})
  }, [publishToChannel, roadmapTimelineChannelName])

  return {
    itemsByStatus,
    setItemStatus,
    reorderTimelineItems,
    refreshTimeline,
    isReady,
  }
}
