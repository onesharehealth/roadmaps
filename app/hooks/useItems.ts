import { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  createRoadmapItemSchema,
  getItemsChannelName,
  ITEMS_ACTIONS,
  ITEMS_EVENTS,
  type RoadmapItem,
  updateRoadmapItemSchema,
} from 'roadmaps-agents/schemas'
import type { z } from 'zod'

import { SessionDetailContext } from '~/components/session/SessionDetailContext'
import { toastChannelError } from '~/lib/toast-channel-error'

type CreateRoadmapItem = z.infer<typeof createRoadmapItemSchema>
type UpdateRoadmapItem = z.infer<typeof updateRoadmapItemSchema>

type UseItemsProps = {
  sessionUuid: string
  userEmail: string
  initialItems: RoadmapItem[]
}

export type UseItemsReturn = {
  items: RoadmapItem[]
  createItem: (data: CreateRoadmapItem) => void
  updateItem: (data: UpdateRoadmapItem) => void
  deleteItem: (itemUuid: string) => void
  reorderItems: (itemOrders: { uuid: string; displayOrder: number }[]) => void
  refreshItems: () => void
  isReady: boolean
}

export function useItems({ sessionUuid, userEmail, initialItems }: UseItemsProps): UseItemsReturn {
  const [items, setItems] = useState<RoadmapItem[]>(initialItems)
  const [isReady, setIsReady] = useState(false)

  const context = useContext(SessionDetailContext)
  const isConnected = context?.isConnected ?? false
  const isBootstrapped = context?.isBootstrapped ?? false
  const subscribeToChannel = context?.subscribeToChannel
  const publishToChannel = context?.publishToChannel
  const initialState = context?.initialState

  const itemsChannelName = useMemo(() => getItemsChannelName(sessionUuid), [sessionUuid])

  useEffect(() => {
    if (initialState?.items?.items) {
      setItems(initialState.items.items)
    }
  }, [initialState])

  useEffect(() => {
    if (!isConnected || !isBootstrapped || !sessionUuid || !subscribeToChannel) {
      setIsReady(false)
      return
    }

    const unsubscribe = subscribeToChannel(itemsChannelName, {
      [ITEMS_EVENTS.CREATED]: (payload) => {
        const data = payload as { item: RoadmapItem }
        setItems((prev) => [...prev, data.item])
      },
      [ITEMS_EVENTS.UPDATED]: (payload) => {
        const data = payload as { item: RoadmapItem }
        setItems((prev) => prev.map((item) => (item.uuid === data.item.uuid ? data.item : item)))
      },
      [ITEMS_EVENTS.DELETED]: (payload) => {
        const data = payload as { itemUuid: string }
        setItems((prev) => prev.filter((item) => item.uuid !== data.itemUuid))
      },
      [ITEMS_EVENTS.REORDERED]: (payload) => {
        const data = payload as { items: RoadmapItem[] }
        setItems(data.items)
      },
      [ITEMS_EVENTS.ALL_ITEMS]: (payload) => {
        const data = payload as { items: RoadmapItem[] }
        setItems(data.items)
      },
      [ITEMS_EVENTS.ERROR]: (payload) => {
        console.error('[useItems] Error:', payload)
        toastChannelError(payload as { message?: string; action?: string })
      },
    })

    setIsReady(true)

    return () => {
      unsubscribe()
      setIsReady(false)
    }
  }, [isConnected, isBootstrapped, itemsChannelName, subscribeToChannel, sessionUuid])

  const createItem = useCallback(
    (data: CreateRoadmapItem) => {
      if (!isReady || !publishToChannel) return
      publishToChannel(itemsChannelName, ITEMS_ACTIONS.CREATE, data)
    },
    [publishToChannel, itemsChannelName, isReady],
  )

  const updateItem = useCallback(
    (data: UpdateRoadmapItem) => {
      if (!isReady || !publishToChannel) return
      publishToChannel(itemsChannelName, ITEMS_ACTIONS.UPDATE, data)
    },
    [publishToChannel, itemsChannelName, isReady],
  )

  const deleteItem = useCallback(
    (itemUuid: string) => {
      if (!isReady || !publishToChannel) return
      publishToChannel(itemsChannelName, ITEMS_ACTIONS.DELETE, { itemUuid })
    },
    [publishToChannel, itemsChannelName, isReady],
  )

  const reorderItems = useCallback(
    (itemOrders: { uuid: string; displayOrder: number }[]) => {
      if (!isReady || !publishToChannel) return
      publishToChannel(itemsChannelName, ITEMS_ACTIONS.REORDER, { itemOrders })
    },
    [publishToChannel, itemsChannelName, isReady],
  )

  const refreshItems = useCallback(() => {
    if (!isReady || !publishToChannel) return
    publishToChannel(itemsChannelName, ITEMS_ACTIONS.GET_ALL, {})
  }, [publishToChannel, itemsChannelName, isReady])

  return {
    items,
    createItem,
    updateItem,
    deleteItem,
    reorderItems,
    refreshItems,
    isReady,
  }
}
