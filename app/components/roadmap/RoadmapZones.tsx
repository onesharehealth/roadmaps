import {
  ROADMAP_STATUS,
  type RoadmapItem,
  type RoadmapStatus,
} from 'roadmaps-agents/schemas'

import { ItemInlineCreate } from '~/components/items/ItemInlineCreate'
import { useSessionDetail } from '~/components/session/SessionDetailContext'
import type { TimelineSettings } from '~/utils/cycles'
import {
  DEFAULT_TIMELINE_SETTINGS,
  type RoadmapZonesProps,
} from './roadmap-zones-types'
import { StatusDropArea } from './status-drop-area'
import { TimelineDropArea } from './timeline-drop-area'

export function RoadmapZones({
  itemsByStatus,
  isConnected,
  timelineSettings,
  onSetItemStatus,
  onReorderTimelineItems,
  onUpdateDurationWeeks,
  onCreateItem,
  onUpdateItem,
  onDeleteItem,
}: RoadmapZonesProps) {
  const settings: TimelineSettings = timelineSettings
    ? {
        cycleLengthWeeks: timelineSettings.cycleLengthWeeks,
        cooldownWeeks: timelineSettings.cooldownWeeks,
        startDate: timelineSettings.startDate,
        cycleStartNumber: timelineSettings.cycleStartNumber,
      }
    : DEFAULT_TIMELINE_SETTINGS
  const { canEdit } = useSessionDetail()
  const canReorder = canEdit

  const timelineItems = itemsByStatus.assigned

  const allItems = [
    ...itemsByStatus.unaddressed,
    ...itemsByStatus.assigned,
    ...itemsByStatus.completed,
  ].sort((a, b) => (a.roadmapOrder ?? 0) - (b.roadmapOrder ?? 0))

  const handleReorderTimeline = (reorderedItems: RoadmapItem[]) => {
    onReorderTimelineItems({
      itemOrders: reorderedItems.map((item, index) => ({
        uuid: item.uuid,
        roadmapOrder: index,
      })),
    })
  }

  const handleCrossStatusDrop = (
    item: RoadmapItem,
    targetIndex: number,
    targetStatus: RoadmapStatus,
  ) => {
    onSetItemStatus({ itemUuid: item.uuid, status: targetStatus })

    const targetStatusItems = itemsByStatus[targetStatus] || []
    const otherItems = allItems.filter(
      (i) => i.uuid !== item.uuid && i.roadmapStatus !== targetStatus,
    )

    const newTargetStatusItems = [...targetStatusItems]
    newTargetStatusItems.splice(targetIndex, 0, {
      ...item,
      roadmapStatus: targetStatus,
    })

    let currentOrder = 0
    const itemOrders: { uuid: string; roadmapOrder: number }[] = []

    for (const otherItem of otherItems) {
      itemOrders.push({
        uuid: otherItem.uuid,
        roadmapOrder: currentOrder++,
      })
    }

    for (const targetItem of newTargetStatusItems) {
      itemOrders.push({
        uuid: targetItem.uuid,
        roadmapOrder: currentOrder++,
      })
    }

    onReorderTimelineItems({ itemOrders })
  }

  const handleReorderWithinStatus =
    (status: RoadmapStatus) => (reorderedItems: RoadmapItem[]) => {
      const baseOrder = Math.min(
        ...itemsByStatus[status].map((item) => item.roadmapOrder ?? 0),
      )
      const itemOrders = reorderedItems.map((item, index) => ({
        uuid: item.uuid,
        roadmapOrder: baseOrder + index,
      }))

      const optimisticItemsByStatus: Record<RoadmapStatus, RoadmapItem[]> = {
        ...itemsByStatus,
        [status]: reorderedItems,
      }
      onReorderTimelineItems({ itemOrders, optimisticItemsByStatus })
    }

  const handleSetItemStatusWithReorder = (params: {
    itemUuid: string
    status: RoadmapStatus
    roadmapOrder?: number
  }) => {
    onSetItemStatus(params)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded border-2 border-green-400 bg-green-100 dark:bg-green-950/60" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Generally stable zone
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded border-2 border-blue-400 bg-blue-100 dark:bg-blue-950/60" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Active planning zone
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded border-2 border-purple-400 bg-purple-100 dark:bg-purple-950/60" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Strategic planning zone
          </span>
        </div>
      </div>

      <TimelineDropArea
        items={timelineItems}
        canReorder={canReorder}
        canEdit={canEdit}
        isConnected={isConnected}
        timelineSettings={settings}
        onCrossStatusDrop={handleCrossStatusDrop}
        onReorderItems={handleReorderTimeline}
        onSetStatus={handleSetItemStatusWithReorder}
        onUpdateDurationWeeks={onUpdateDurationWeeks}
        onUpdateItem={onUpdateItem}
        onDeleteItem={onDeleteItem}
        itemsByStatus={itemsByStatus}
      />

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          {canEdit && (
            <ItemInlineCreate
              isConnected={isConnected}
              onCreateItem={onCreateItem}
            />
          )}
          <StatusDropArea
            status={ROADMAP_STATUS.UNADDRESSED}
            items={itemsByStatus.unaddressed}
            canReorder={canReorder}
            canEdit={canEdit}
            isConnected={isConnected}
            onCrossStatusDrop={handleCrossStatusDrop}
            onReorderItems={handleReorderWithinStatus(
              ROADMAP_STATUS.UNADDRESSED,
            )}
            onSetStatus={handleSetItemStatusWithReorder}
            onUpdateItem={onUpdateItem}
            onDeleteItem={onDeleteItem}
            title="Unaddressed Items"
            description="Items not yet assigned to the timeline"
            itemsByStatus={itemsByStatus}
          />
        </div>

        <StatusDropArea
          status={ROADMAP_STATUS.COMPLETED}
          items={itemsByStatus.completed}
          canReorder={canReorder}
          canEdit={canEdit}
          isConnected={isConnected}
          onCrossStatusDrop={handleCrossStatusDrop}
          onReorderItems={handleReorderWithinStatus(ROADMAP_STATUS.COMPLETED)}
          onSetStatus={handleSetItemStatusWithReorder}
          onUpdateItem={onUpdateItem}
          onDeleteItem={onDeleteItem}
          title="Completed Items"
          description="Items that have been completed"
          itemsByStatus={itemsByStatus}
        />
      </div>
    </div>
  )
}
