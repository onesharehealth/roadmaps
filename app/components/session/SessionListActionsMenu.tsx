import { useState } from 'react'
import { useFetcher } from 'react-router'
import { FolderInput, MoreVertical, Trash2 } from 'lucide-react'
import type { SessionType } from 'roadmaps-agents/schemas'

import { Button } from '~/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import { sessionPath } from '~/utils/sessions'
import { getLocationLabel, getLocationValue, SessionLocationDialog } from './SessionLocation'

type SessionListActionsMenuProps = {
  uuid: string
  sessionType: SessionType
  sessionName: string
  currentTeamId: string | null
  currentTeamName: string | null
  teams: Array<{ id: string; name: string }>
  canManageSession: boolean
}

export function SessionListActionsMenu({
  uuid,
  sessionType,
  sessionName,
  currentTeamId,
  currentTeamName,
  teams,
  canManageSession,
}: SessionListActionsMenuProps) {
  const fetcher = useFetcher()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [moveDialogOpen, setMoveDialogOpen] = useState(false)
  const isDeleting = fetcher.state !== 'idle'
  const canMove = canManageSession && teams.length > 0
  const currentLocation = getLocationValue(currentTeamId)
  const locationLabel = getLocationLabel({ teamId: currentTeamId, currentTeamName })

  function handleOpenChange(open: boolean) {
    if (!open) setConfirmDelete(false)
  }

  function handleDeleteClick(e: Event) {
    e.preventDefault()

    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }

    const formData = new FormData()
    formData.set('intent', 'delete-session')
    formData.set('uuid', uuid)
    formData.set('sessionType', sessionType)
    fetcher.submit(formData, { method: 'post' })
    setConfirmDelete(false)
  }

  function handleMoveClick(e: Event) {
    e.preventDefault()
    setMoveDialogOpen(true)
  }

  return (
    <>
      <DropdownMenu onOpenChange={handleOpenChange}>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="shrink-0"
            aria-label="Session actions"
            onClick={(e) => e.preventDefault()}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {canMove && (
            <DropdownMenuItem onSelect={handleMoveClick}>
              <FolderInput className="h-4 w-4" />
              Move location
            </DropdownMenuItem>
          )}
          <DropdownMenuItem variant="destructive" disabled={isDeleting} onSelect={handleDeleteClick}>
            <Trash2 className="h-4 w-4" />
            {confirmDelete ? 'Confirm delete' : 'Delete'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {canMove && (
        <SessionLocationDialog
          currentLocation={currentLocation}
          label={locationLabel}
          teams={teams}
          sessionName={sessionName}
          isConnected
          formAction={sessionPath(sessionType, uuid)}
          open={moveDialogOpen}
          onOpenChange={setMoveDialogOpen}
          showTrigger={false}
        />
      )}
    </>
  )
}
