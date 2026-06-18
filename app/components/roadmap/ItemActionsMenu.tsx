import { useEffect, useRef, useState } from 'react'
import { useFetcher } from 'react-router'
import { CheckCircle, Edit2, MoreVertical, Send, Sparkles, Trash2 } from 'lucide-react'
import { ROADMAP_STATUS, type RoadmapStatus } from 'roadmaps-agents/schemas'
import { toast } from 'sonner'

import { Button } from '~/components/ui/button'

type GenerateDescriptionResult = {
  ok: boolean
  error?: string
}

type ItemActionsMenuProps = {
  onEdit: () => void
  onDelete: () => void
  isConnected: boolean
  itemType?: string
  itemUuid: string
  externalContent?: string | null
  currentStatus?: RoadmapStatus
  onSetStatus?: (newStatus: RoadmapStatus) => void
  onMarkComplete?: () => void
  onOpenChange?: (isOpen: boolean) => void
}

const STATUS_LABELS: Record<RoadmapStatus, string> = {
  [ROADMAP_STATUS.UNADDRESSED]: 'Unaddressed Items',
  [ROADMAP_STATUS.ASSIGNED]: 'Assigned to Timeline',
  [ROADMAP_STATUS.COMPLETED]: 'Completed Items',
}

export function ItemActionsMenu({
  onEdit,
  onDelete,
  isConnected,
  itemType = 'item',
  itemUuid,
  externalContent,
  currentStatus,
  onSetStatus,
  onMarkComplete,
  onOpenChange,
}: ItemActionsMenuProps) {
  const generateDescriptionFetcher = useFetcher<GenerateDescriptionResult>()
  const [isOpen, setIsOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const lastHandledFetcherData = useRef<GenerateDescriptionResult | null>(null)

  const hasRoadmapActions = Boolean(currentStatus && onSetStatus)
  const availableStatuses = hasRoadmapActions
    ? Object.values(ROADMAP_STATUS).filter((status) => status !== currentStatus)
    : []

  useEffect(() => {
    const data = generateDescriptionFetcher.data
    if (!data || data === lastHandledFetcherData.current) return

    lastHandledFetcherData.current = data

    if (data.ok) {
      toast.success('AI description generated')
      closeMenu()
      return
    }

    toast.error(data.error ?? 'Failed to generate description')
  }, [generateDescriptionFetcher.data])

  useEffect(() => {
    function handleClickOutside(event: Event) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        closeMenu()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside, {
        passive: true,
      })
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [isOpen])

  function closeMenu() {
    setIsOpen(false)
    setConfirmDelete(false)
    onOpenChange?.(false)
  }

  function toggleMenu() {
    const nextIsOpen = !isOpen
    setIsOpen(nextIsOpen)
    onOpenChange?.(nextIsOpen)
  }

  const handleEdit = () => {
    onEdit()
    closeMenu()
  }

  const handleDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }

    onDelete()
    closeMenu()
  }

  const handleSetStatus = (status: RoadmapStatus) => {
    onSetStatus?.(status)
    closeMenu()
  }

  const handleMarkComplete = () => {
    onMarkComplete?.()
    closeMenu()
  }

  const hasExternalContent = externalContent && externalContent.trim().length > 0

  return (
    <div className="relative" ref={menuRef}>
      <Button
        ref={buttonRef}
        onClick={(e) => {
          e.stopPropagation()
          toggleMenu()
        }}
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600"
        disabled={!isConnected}
        aria-label={`${itemType} actions`}
      >
        <MoreVertical size={16} />
      </Button>

      {isOpen && (
        <div
          className={`absolute top-full right-0 z-50 mt-1 rounded-md border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800 ${
            hasRoadmapActions ? 'w-48' : 'w-40'
          }`}
        >
          {hasRoadmapActions && (
            <>
              {currentStatus !== ROADMAP_STATUS.COMPLETED && onMarkComplete && (
                <button
                  onClick={handleMarkComplete}
                  disabled={!isConnected}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-green-600 hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-50 dark:text-green-400 dark:hover:bg-green-900"
                >
                  <CheckCircle size={14} />
                  Mark as Complete
                </button>
              )}

              <span className="block px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
                Change Status
              </span>
              {availableStatuses.map((status) => (
                <button
                  key={status}
                  onClick={() => handleSetStatus(status)}
                  disabled={!isConnected}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  <Send size={14} className="text-blue-500" />
                  {STATUS_LABELS[status]}
                </button>
              ))}

              <div className="my-1 border-t border-gray-200 dark:border-gray-700" />
            </>
          )}

          {hasExternalContent && (
            <>
              <generateDescriptionFetcher.Form method="post" className="contents">
                <input type="hidden" name="intent" value="generate-ai-description" />
                <input type="hidden" name="itemUuid" value={itemUuid} />
                <button
                  type="submit"
                  disabled={!isConnected || generateDescriptionFetcher.state !== 'idle'}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-purple-600 hover:bg-purple-50 disabled:cursor-not-allowed disabled:opacity-50 dark:text-purple-400 dark:hover:bg-purple-900"
                >
                  <Sparkles size={14} />
                  {generateDescriptionFetcher.state !== 'idle' ? 'Generating...' : 'Generate AI Description'}
                </button>
              </generateDescriptionFetcher.Form>
              <div className="my-1 border-t border-gray-200 dark:border-gray-700" />
            </>
          )}

          <button
            onClick={handleEdit}
            disabled={!isConnected}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <Edit2 size={14} className="text-blue-500" />
            Edit {itemType}
          </button>

          <div className="my-1 border-t border-gray-200 dark:border-gray-700" />

          <button
            onClick={handleDelete}
            disabled={!isConnected}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-900"
          >
            <Trash2 size={14} />
            {confirmDelete ? 'Confirm delete' : `Delete ${itemType}`}
          </button>
        </div>
      )}
    </div>
  )
}
