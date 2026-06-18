import { useEffect, useRef, useState } from 'react'
import { dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter'
import type { RoadmapItem } from 'roadmaps-agents/schemas'

import type { DragData } from './roadmap-zones-types'

function getInsertIndexFromDrop(
  element: HTMLElement,
  dropY: number,
  fallback: number,
) {
  const itemElements = Array.from(element.querySelectorAll('[data-item-uuid]'))
  let insertIndex = fallback

  for (let i = 0; i < itemElements.length; i++) {
    const rect = itemElements[i].getBoundingClientRect()
    const midpoint = rect.top + rect.height / 2

    if (dropY < midpoint) {
      insertIndex = i
      break
    }
  }

  return insertIndex
}

export function useRoadmapDropTarget({
  canReorder,
  itemCount,
  onDrop,
}: {
  canReorder: boolean
  itemCount: number
  onDrop: (dragData: DragData, insertIndex: number) => void
}) {
  const dropRef = useRef<HTMLDivElement>(null)
  const [isDraggedOver, setIsDraggedOver] = useState(false)
  const [draggedItem, setDraggedItem] = useState<RoadmapItem | null>(null)
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null)

  useEffect(() => {
    const element = dropRef.current
    if (!element || !canReorder) return

    return dropTargetForElements({
      element,
      onDragEnter: () => setIsDraggedOver(true),
      onDragLeave: () => {
        setIsDraggedOver(false)
        setDropTargetIndex(null)
        setDraggedItem(null)
      },
      onDrag: ({ source, location }) => {
        const dragData = source.data as DragData
        setDraggedItem((prev) => prev ?? dragData.item)

        const clientY = location.current.input.clientY
        const rect = element.getBoundingClientRect()
        const relativeY = clientY - rect.top

        const itemElements = Array.from(
          element.querySelectorAll('[data-item-uuid]'),
        ) as HTMLElement[]

        let targetIndex = 0
        for (let i = 0; i < itemElements.length; i++) {
          const childRect = itemElements[i].getBoundingClientRect()
          const childRelativeY = childRect.top - rect.top + childRect.height / 2
          if (relativeY > childRelativeY) {
            targetIndex = i + 1
          } else {
            break
          }
        }

        setDropTargetIndex(targetIndex)
      },
      onDrop: ({ source, location }) => {
        setIsDraggedOver(false)
        setDropTargetIndex(null)
        setDraggedItem(null)

        const dragData = source.data as DragData
        const dropElement = dropRef.current
        if (!dropElement) return

        const insertIndex = getInsertIndexFromDrop(
          dropElement,
          location.current.input.clientY,
          itemCount,
        )

        onDrop(dragData, insertIndex)
      },
    })
  }, [canReorder, itemCount, onDrop])

  return {
    dropRef,
    isDraggedOver,
    draggedItem,
    setDraggedItem,
    dropTargetIndex,
  }
}
