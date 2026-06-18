import { Link } from 'react-router'
import type { SessionType } from 'roadmaps-agents/schemas'

import { SessionListActionsMenu } from '~/components/session/SessionListActionsMenu'
import { formatRelativeTimeAgo } from '~/utils/format-session-date'
import { getSessionTileHoverStyle } from '~/utils/session-type-theme'
import { sessionPath } from '~/utils/sessions'
import { SessionTypeIconBadge } from './SessionTypeIcon'

export const emptySessionTeams: Array<{ id: string; name: string }> = []

type SessionTileProps = {
  uuid: string
  sessionType: SessionType
  name: string
  ownerEmail: string
  lastEditedAt: number
  showActions?: boolean
  currentUserEmail?: string
  currentTeamId?: string | null
  currentTeamName?: string | null
  teams?: Array<{ id: string; name: string }>
}

export function SessionTile({
  uuid,
  sessionType,
  name,
  ownerEmail,
  lastEditedAt,
  showActions = false,
  currentUserEmail,
  currentTeamId = null,
  currentTeamName = null,
  teams = emptySessionTeams,
}: SessionTileProps) {
  const canDelete = showActions && ownerEmail === currentUserEmail

  return (
    <div
      className="session-tile session-tile-interactive flex items-center gap-3 p-4"
      style={getSessionTileHoverStyle(sessionType)}
    >
      <Link to={sessionPath(sessionType, uuid)} className="flex min-w-0 flex-1 items-center gap-3">
        <SessionTypeIconBadge sessionType={sessionType} />
        <div className="min-w-0">
          <div className="truncate font-medium">{name}</div>
          <div className="text-muted-foreground flex min-w-0 items-center gap-1 text-xs">
            <span className="truncate">{ownerEmail}</span>
            <span className="shrink-0">·</span>
            <span className="shrink-0">{formatRelativeTimeAgo(lastEditedAt)}</span>
          </div>
        </div>
      </Link>

      {canDelete && (
        <SessionListActionsMenu
          uuid={uuid}
          sessionType={sessionType}
          sessionName={name}
          currentTeamId={currentTeamId}
          currentTeamName={currentTeamName}
          teams={teams}
          isOwner={canDelete}
        />
      )}
    </div>
  )
}
