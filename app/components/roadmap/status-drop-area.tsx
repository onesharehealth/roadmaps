import React, { useCallback } from 'react'
import type { RoadmapItem, RoadmapStatus } from 'roadmaps-agents/schemas'

import { RoadmapZoneItem } from './roadmap-zone-item'
import type {
  DragData,
  RoadmapZoneItemUpdateParams,
} from './roadmap-zones-types'
import { ZONE_INFO as zoneInfoMap } from './roadmap-zones-types'
import { useRoadmapDropTarget } from './use-roadmap-drop-target'

export type StatusDropAreaProps = {
  status: RoadmapStatus
  items: RoadmapItem[]
  canReorder: boolean
  canEdit: boolean
  isConnected: boolean
  onCrossStatusDrop: (
    item: RoadmapItem,
    targetIndex: number,
    targetStatus: RoadmapStatus,
  ) => void
  onReorderItems?: (items: RoadmapItem[]) => void
  onSetStatus: (params: { itemUuid: string; status: RoadmapStatus }) => void
  onUpdateItem: (params: RoadmapZoneItemUpdateParams) => void
  onDeleteItem: (itemUuid: string) => void
  title: string
  description: string
  itemsByStatus: Record<RoadmapStatus, RoadmapItem[]>
}

export function StatusDropArea({
  status,
  items,
  canReorder,
  canEdit,
  isConnected,
  onCrossStatusDrop,
  onReorderItems,
  onSetStatus,
  onUpdateItem,
  onDeleteItem,
  title,
  description,
  itemsByStatus,
}: StatusDropAreaProps) {
  const handleDrop = useCallback(
    (dragData: DragData, insertIndex: number) => {
      const droppedItem = dragData.item
      const sourceStatus = dragData.sourceStatus

      if (sourceStatus !== status) {
        onCrossStatusDrop(droppedItem, insertIndex, status)
      } else if (onReorderItems) {
        const currentIndex = items.findIndex(
          (item) => item.uuid === droppedItem.uuid,
        )
        if (currentIndex !== -1 && currentIndex !== insertIndex) {
          const newItems = [...items]
          newItems.splice(currentIndex, 1)

          const adjustedInsertIndex =
            currentIndex < insertIndex ? insertIndex - 1 : insertIndex
          newItems.splice(adjustedInsertIndex, 0, droppedItem)

          onReorderItems(newItems)
        }
      }
    },
    [status, items, onCrossStatusDrop, onReorderItems],
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

  const zoneInfo =
    status === 'unaddressed' ? zoneInfoMap.unaddressed : zoneInfoMap.completed

  return (
    <div
      className={`rounded-lg p-4 ${zoneInfo.color} border-2 ${
        isDraggedOver ? 'border-blue-500' : zoneInfo.borderColor
      }`}
    >
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {title}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {description}
        </p>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
          {items.length} {items.length === 1 ? 'item' : 'items'}
        </p>
      </div>

      <div
        ref={dropRef}
        className="min-h-[200px] space-y-2"
      >
        {items.length === 0 && !isDraggedOver ? (
          <div className="flex h-[200px] items-center justify-center rounded-md border-2 border-dashed border-gray-300 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
            {canReorder ? 'Drag items here' : 'No items in this status'}
          </div>
        ) : (
          <>
            {items.map((item, index) => (
              <React.Fragment key={item.uuid}>
                {dropTargetIndex === index && draggedItem && (
                  <div className="h-2 rounded bg-blue-200 transition-all duration-200 dark:bg-blue-800" />
                )}
                <div data-item-uuid={item.uuid}>
                  <RoadmapZoneItem
                    item={item}
                    status={status}
                    canReorder={canReorder}
                    canEdit={canEdit}
                    isConnected={isConnected}
                    onDragStart={setDraggedItem}
                    onDragEnd={() => setDraggedItem(null)}
                    onSetStatus={onSetStatus}
                    onUpdateItem={onUpdateItem}
                    onDeleteItem={onDeleteItem}
                    itemsByStatus={itemsByStatus}
                  />
                </div>
              </React.Fragment>
            ))}
            {dropTargetIndex === items.length && draggedItem && (
              <div className="h-2 rounded bg-blue-200 transition-all duration-200 dark:bg-blue-800" />
            )}
          </>
        )}
      </div>
    </div>
  )
}
