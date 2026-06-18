import type { RoadmapTimelineSettings } from 'roadmaps-agents/schemas'
import type { RoadmapItem, RoadmapStatus } from 'roadmaps-agents/schemas'

import type { TimelineSettings } from '~/utils/cycles'

export const DEFAULT_TIMELINE_SETTINGS: TimelineSettings = {
  cycleLengthWeeks: 6,
  cooldownWeeks: 2,
  startDate: new Date().toISOString().slice(0, 10),
  cycleStartNumber: 19,
}

export type RoadmapZonesProps = {
  itemsByStatus: Record<RoadmapStatus, RoadmapItem[]>
  isConnected: boolean
  timelineSettings?: RoadmapTimelineSettings | null
  onSetItemStatus: (params: {
    itemUuid: string
    status: RoadmapStatus
    roadmapOrder?: number
  }) => void
  onReorderTimelineItems: (params: {
    itemOrders: { uuid: string; roadmapOrder: number }[]
    optimisticItemsByStatus?: Record<RoadmapStatus, RoadmapItem[]>
  }) => void
  onUpdateDurationWeeks: (params: {
    itemUuid: string
    durationWeeks: number
  }) => void
  onCreateItem: (params: { title: string; description?: string }) => void
  onUpdateItem: (params: {
    itemUuid: string
    title: string
    description?: string
    durationWeeks?: number
  }) => void
  onDeleteItem: (itemUuid: string) => void
}

export type DragData = {
  item: RoadmapItem
  sourceStatus: RoadmapStatus
}

export type RoadmapZoneItemUpdateParams = {
  itemUuid: string
  title: string
  description?: string
  durationWeeks?: number
}

export type RoadmapZoneSetStatusParams = {
  itemUuid: string
  status: RoadmapStatus
  roadmapOrder?: number
}

export const ZONE_INFO = {
  stable: {
    title: 'Generally Stable Zone',
    description: 'Current cycle',
    color: 'bg-green-50 dark:bg-green-950',
    borderColor: 'border-green-300 dark:border-green-700',
  },
  planning: {
    title: 'Planning Zone',
    description: 'Next cycle',
    color: 'bg-blue-50 dark:bg-blue-950',
    borderColor: 'border-blue-300 dark:border-blue-700',
  },
  strategic: {
    title: 'Strategic Zone',
    description: 'Following cycles',
    color: 'bg-purple-50 dark:bg-purple-950',
    borderColor: 'border-purple-300 dark:border-purple-700',
  },
  unaddressed: {
    title: 'Unaddressed Items',
    description: 'Items not yet assigned to a zone',
    color: 'bg-gray-100 dark:bg-gray-800',
    borderColor: 'border-gray-300 dark:border-gray-700',
  },
  completed: {
    title: 'Completed Items',
    description: 'Items that have been completed',
    color: 'bg-emerald-50 dark:bg-emerald-950',
    borderColor: 'border-emerald-300 dark:border-emerald-700',
  },
}
