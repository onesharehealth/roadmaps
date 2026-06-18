import { useEffect, useRef, useState } from 'react'
import { draggable } from '@atlaskit/pragmatic-drag-and-drop/element/adapter'
import { GripVertical } from 'lucide-react'
import {
  ROADMAP_STATUS,
  type RoadmapItem,
  type RoadmapStatus,
} from 'roadmaps-agents/schemas'

import { ItemFormFields } from '~/components/items/ItemFormFields'
import { Button } from '~/components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '~/components/ui/toggle-group'
import { ItemActionsMenu } from './ItemActionsMenu'
import type {
  DragData,
  RoadmapZoneItemUpdateParams,
  RoadmapZoneSetStatusParams,
} from './roadmap-zones-types'

export type RoadmapZoneItemProps = {
  item: RoadmapItem
  status: RoadmapStatus
  canReorder: boolean
  canEdit: boolean
  isConnected: boolean
  onDragStart: (item: RoadmapItem) => void
  onDragEnd: () => void
  onSetStatus: (params: RoadmapZoneSetStatusParams) => void
  onUpdateDurationWeeks?: (params: {
    itemUuid: string
    durationWeeks: number
  }) => void
  onUpdateItem: (params: RoadmapZoneItemUpdateParams) => void
  onDeleteItem: (itemUuid: string) => void
  itemsByStatus: Record<RoadmapStatus, RoadmapItem[]>
}

export function RoadmapZoneItem({
  item,
  status,
  canReorder,
  canEdit,
  isConnected,
  onDragStart,
  onDragEnd,
  onSetStatus,
  onUpdateDurationWeeks,
  onUpdateItem,
  onDeleteItem,
}: RoadmapZoneItemProps) {
  const itemRef = useRef<HTMLDivElement>(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(item.title)
  const [editDescription, setEditDescription] = useState(item.description || '')

  useEffect(() => {
    const element = itemRef.current
    if (!element || !canReorder) return

    return draggable({
      element,
      getInitialData: () => ({ item, sourceStatus: status } as DragData),
      onDragStart: () => onDragStart(item),
      onDrop: () => onDragEnd(),
    })
  }, [item, status, canReorder, onDragStart, onDragEnd])

  const handleDurationWeeksChange = (value: string) => {
    if (value && onUpdateDurationWeeks) {
      const newDuration = parseInt(value, 10)
      if (newDuration >= 1 && newDuration <= 6) {
        onUpdateDurationWeeks({
          itemUuid: item.uuid,
          durationWeeks: newDuration,
        })
      }
    }
  }

  const handleSetStatus = (newStatus: RoadmapStatus) => {
    onSetStatus({ itemUuid: item.uuid, status: newStatus })
  }

  function handleSaveEdit() {
    if (!editTitle.trim()) return
    onUpdateItem({
      itemUuid: item.uuid,
      title: editTitle.trim(),
      description: editDescription.trim() || undefined,
      durationWeeks: item.durationWeeks ?? undefined,
    })
    setIsEditing(false)
  }

  function handleStartEdit() {
    setEditTitle(item.title)
    setEditDescription(item.description || '')
    setIsEditing(true)
  }

  return (
    <div
      ref={itemRef}
      className={`group flex h-full min-w-0 items-start gap-2 rounded-md border bg-white/90 p-3 shadow-sm backdrop-blur-sm dark:bg-gray-900/90 ${
        canReorder ? 'cursor-grab active:cursor-grabbing' : ''
      } ${isMenuOpen ? 'relative z-50' : 'relative z-0'}`}
    >
      {canReorder && !isEditing && (
        <div className="drag-handle shrink-0 pt-1 text-gray-400">
          <GripVertical className="h-4 w-4" />
        </div>
      )}
      <div className="min-w-0 flex-1 overflow-hidden">
        {isEditing ? (
          <div className="space-y-2">
            <ItemFormFields
              title={editTitle}
              description={editDescription}
              onTitleChange={setEditTitle}
              onDescriptionChange={setEditDescription}
            />
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                onClick={handleSaveEdit}
                disabled={!editTitle.trim()}
              >
                Save
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setIsEditing(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="font-medium text-gray-900 dark:text-gray-100">
              {item.title}
            </div>
            {item.description && (
              <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {item.description}
              </div>
            )}
          </>
        )}
      </div>
      {!isEditing && canEdit && (
        <div className="flex shrink-0 items-start gap-1">
          {canReorder &&
            status === ROADMAP_STATUS.ASSIGNED &&
            onUpdateDurationWeeks && (
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Weeks:
                </span>
                <ToggleGroup
                  type="single"
                  size="sm"
                  value={(item.durationWeeks ?? 6).toString()}
                  onValueChange={handleDurationWeeksChange}
                  className="flex gap-0"
                >
                  {[1, 2, 3, 4, 5, 6].map((w) => (
                    <ToggleGroupItem
                      key={w}
                      value={w.toString()}
                      className="px-2 py-1 text-xs"
                    >
                      {w}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>
            )}
          <ItemActionsMenu
            onEdit={handleStartEdit}
            onDelete={() => onDeleteItem(item.uuid)}
            isConnected={isConnected}
            itemUuid={item.uuid}
            externalContent={item.externalContent}
            currentStatus={canReorder ? status : undefined}
            onSetStatus={canReorder ? handleSetStatus : undefined}
            onMarkComplete={
              canReorder
                ? () =>
                    onSetStatus({
                      itemUuid: item.uuid,
                      status: ROADMAP_STATUS.COMPLETED,
                    })
                : undefined
            }
            onOpenChange={setIsMenuOpen}
          />
        </div>
      )}
    </div>
  )
}
