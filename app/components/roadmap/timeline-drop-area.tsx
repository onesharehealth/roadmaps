import { useCallback } from 'react'
import {
  ROADMAP_STATUS,
  type RoadmapItem,
  type RoadmapStatus,
} from 'roadmaps-agents/schemas'

import {
  computeItemPositionsWithCooldown,
  formatCycleLong,
  getCycleForPosition,
  type TimelineSettings,
} from '~/utils/cycles'
import { RoadmapZoneItem } from './roadmap-zone-item'
import type {
  DragData,
  RoadmapZoneItemUpdateParams,
} from './roadmap-zones-types'
import { useRoadmapDropTarget } from './use-roadmap-drop-target'

const PIXELS_PER_WEEK = 48

export type TimelineDropAreaProps = {
  items: RoadmapItem[]
  canReorder: boolean
  canEdit: boolean
  isConnected: boolean
  timelineSettings: TimelineSettings
  onCrossStatusDrop: (
    item: RoadmapItem,
    targetIndex: number,
    targetStatus: RoadmapStatus,
  ) => void
  onReorderItems: (items: RoadmapItem[]) => void
  onSetStatus: (params: { itemUuid: string; status: RoadmapStatus }) => void
  onUpdateDurationWeeks: (params: {
    itemUuid: string
    durationWeeks: number
  }) => void
  onUpdateItem: (params: RoadmapZoneItemUpdateParams) => void
  onDeleteItem: (itemUuid: string) => void
  itemsByStatus: Record<RoadmapStatus, RoadmapItem[]>
}

export function TimelineDropArea({
  items,
  canReorder,
  canEdit,
  isConnected,
  timelineSettings,
  onCrossStatusDrop,
  onReorderItems,
  onSetStatus,
  onUpdateDurationWeeks,
  onUpdateItem,
  onDeleteItem,
  itemsByStatus,
}: TimelineDropAreaProps) {
  const handleDrop = useCallback(
    (dragData: DragData, insertIndex: number) => {
      const droppedItem = dragData.item
      const sourceStatus = dragData.sourceStatus
      const isFromTimeline = sourceStatus === ROADMAP_STATUS.ASSIGNED

      if (isFromTimeline) {
        const currentIndex = items.findIndex(
          (item) => item.uuid === droppedItem.uuid,
        )
        const newItems = [...items]
        newItems.splice(currentIndex, 1)

        const adjustedInsertIndex =
          currentIndex < insertIndex ? insertIndex - 1 : insertIndex
        newItems.splice(adjustedInsertIndex, 0, droppedItem)

        onReorderItems(newItems)
      } else {
        onCrossStatusDrop(droppedItem, insertIndex, ROADMAP_STATUS.ASSIGNED)
      }
    },
    [items, onCrossStatusDrop, onReorderItems],
  )

  const {
    dropRef,
    isDraggedOver,
    draggedItem,
    setDraggedItem,
    dropTargetIndex,
  } = useRoadmapDropTarget({
    canReorder,
    itemCount: items.length,
    onDrop: handleDrop,
  })

  const periodWeeks =
    timelineSettings.cycleLengthWeeks + timelineSettings.cooldownWeeks
  const cycleHeight = periodWeeks * PIXELS_PER_WEEK
  const activeHeight = timelineSettings.cycleLengthWeeks * PIXELS_PER_WEEK
  const cooldownHeight = timelineSettings.cooldownWeeks * PIXELS_PER_WEEK

  const itemsWithPositions = computeItemPositionsWithCooldown(
    items.map((item) => ({
      ...item,
      durationWeeks: item.durationWeeks ?? 6,
    })),
    timelineSettings,
  )
  const lastItemEnd =
    itemsWithPositions.length > 0
      ? itemsWithPositions[itemsWithPositions.length - 1].startWeeks +
        (itemsWithPositions[itemsWithPositions.length - 1].item.durationWeeks ??
          6)
      : 0
  const rawTotalWeeks = Math.max(lastItemEnd, periodWeeks * 4)
  const totalCycles = Math.ceil(rawTotalWeeks / periodWeeks)
  const totalWeeks = totalCycles * periodWeeks
  const totalHeight = totalWeeks * PIXELS_PER_WEEK

  const zoneBands = [
    {
      zone: 'stable' as const,
      startCycle: 0,
      endCycle: 1,
      bgColor: 'bg-green-100 dark:bg-green-950/60',
    },
    {
      zone: 'planning' as const,
      startCycle: 1,
      endCycle: 2,
      bgColor: 'bg-blue-100 dark:bg-blue-950/60',
    },
    {
      zone: 'strategic' as const,
      startCycle: 2,
      endCycle: totalCycles,
      bgColor: 'bg-purple-100 dark:bg-purple-950/60',
    },
  ]

  return (
    <div
      ref={dropRef}
      className={`bg-white dark:bg-gray-900 ${
        isDraggedOver
          ? 'border-blue-500'
          : 'border-gray-300 dark:border-gray-700'
      }`}
    >
      <div className="space-y-2">
        {items.length === 0 && !isDraggedOver ? (
          <div className="flex h-[288px] items-center justify-center rounded-md border-2 border-dashed border-gray-300 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
            {canReorder
              ? 'Drag items here to add to timeline'
              : 'No items in timeline'}
          </div>
        ) : (
          <div
            className="relative flex gap-4 overflow-hidden"
            style={{ height: `${totalHeight}px` }}
          >
            {zoneBands.map(({ zone, startCycle, endCycle, bgColor }) => (
              <div
                key={zone}
                className={`absolute left-0 right-0 z-[1] ${bgColor}`}
                style={{
                  top: `${startCycle * cycleHeight}px`,
                  height: `${(endCycle - startCycle) * cycleHeight}px`,
                }}
              />
            ))}

            {Array.from({ length: totalWeeks + 1 }, (_, weekIndex) => (
              <div
                key={`week-${weekIndex}`}
                className="pointer-events-none absolute left-0 right-0 z-[3] border-b border-gray-300/70 dark:border-gray-500/50"
                style={{
                  top: `${weekIndex * PIXELS_PER_WEEK}px`,
                }}
              />
            ))}

            {timelineSettings.cooldownWeeks > 0 &&
              Array.from({ length: totalCycles }, (_, cycleIndex) => {
                const zone =
                  cycleIndex === 0
                    ? 'stable'
                    : cycleIndex === 1
                    ? 'planning'
                    : 'strategic'
                const stripeColor =
                  zone === 'stable'
                    ? 'rgba(34, 197, 94, 0.5)'
                    : zone === 'planning'
                    ? 'rgba(59, 130, 246, 0.5)'
                    : 'rgba(168, 85, 247, 0.5)'
                return (
                  <div
                    key={`cooldown-${cycleIndex}`}
                    className="pointer-events-none absolute left-0 right-0 z-[2]"
                    style={{
                      top: `${cycleIndex * cycleHeight + activeHeight}px`,
                      height: `${cooldownHeight}px`,
                      background: `repeating-linear-gradient(
                              -45deg,
                              transparent,
                              transparent 4px,
                              ${stripeColor} 4px,
                              ${stripeColor} 8px
                            )`,
                    }}
                  />
                )
              })}

            <div
              className="relative z-10 shrink-0"
              style={{ width: '140px', height: `${totalHeight}px` }}
            >
              <div className="absolute bottom-0 left-14 top-0 w-0.5 bg-gray-300 dark:bg-gray-600" />

              {Array.from({ length: totalCycles }, (_, i) => {
                const cycle = getCycleForPosition(i, timelineSettings)
                const zone =
                  i === 0 ? 'stable' : i === 1 ? 'planning' : 'strategic'
                const zoneColor =
                  zone === 'stable'
                    ? 'text-green-600 dark:text-green-400'
                    : zone === 'planning'
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-purple-600 dark:text-purple-400'

                return (
                  <div
                    key={cycle.number}
                    className="absolute flex items-center gap-2 pl-2"
                    style={{ top: `${i * cycleHeight}px` }}
                  >
                    <div
                      className="flex items-center gap-2 pt-1"
                      style={{ width: '50px' }}
                    >
                      <span className={`text-xl font-semibold ${zoneColor}`}>
                        C{cycle.number}
                      </span>
                    </div>
                    <div className="pt-3 text-xs text-gray-500 dark:text-gray-400">
                      {formatCycleLong(cycle)
                        .split('-')
                        .map((part) => (
                          <span
                            style={{ display: 'block' }}
                            key={part}
                          >
                            {part}
                          </span>
                        ))}
                    </div>
                  </div>
                )
              })}
            </div>

            <div
              className="relative z-10 flex-1"
              style={{ height: `${totalHeight}px` }}
            >
              {itemsWithPositions.map(({ item, index, startWeeks }) => {
                const topPosition = startWeeks * PIXELS_PER_WEEK
                const itemHeight = (item.durationWeeks ?? 6) * PIXELS_PER_WEEK

                return (
                  <div
                    key={item.uuid}
                    data-item-uuid={item.uuid}
                    className="absolute left-0 right-0 min-w-0"
                    style={{
                      top: `${topPosition}px`,
                      height: `${itemHeight}px`,
                    }}
                  >
                    {dropTargetIndex === index && draggedItem && (
                      <div className="mb-2 h-2 rounded bg-blue-200 transition-all duration-200 dark:bg-blue-800" />
                    )}
                    <div className="mb-2 h-full min-w-0 pb-0 pr-1 pt-1">
                      <RoadmapZoneItem
                        item={item}
                        status={ROADMAP_STATUS.ASSIGNED}
                        canReorder={canReorder}
                        canEdit={canEdit}
                        isConnected={isConnected}
                        onDragStart={setDraggedItem}
                        onDragEnd={() => setDraggedItem(null)}
                        onSetStatus={onSetStatus}
                        onUpdateDurationWeeks={onUpdateDurationWeeks}
                        onUpdateItem={onUpdateItem}
                        onDeleteItem={onDeleteItem}
                        itemsByStatus={itemsByStatus}
                      />
                    </div>
                  </div>
                )
              })}
              {dropTargetIndex === items.length && draggedItem && (
                <div
                  className="absolute left-0 right-0 h-2 rounded bg-blue-200 transition-all duration-200 dark:bg-blue-800"
                  style={{ top: `${lastItemEnd * PIXELS_PER_WEEK}px` }}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
