import type { EnrichedSessionListEntry } from '~/data/session-list.server'
import { emptySessionTeams, SessionTile } from './SessionTile'
type SessionTileGridProps = {
  sessions: EnrichedSessionListEntry[]
  showActions?: boolean
  currentUserEmail?: string
  currentTeamId?: string | null
  currentTeamName?: string | null
  teams?: Array<{ id: string; name: string }>
}

export function SessionTileGrid({
  sessions,
  showActions = false,
  currentUserEmail,
  currentTeamId = null,
  currentTeamName = null,
  teams = emptySessionTeams,
}: SessionTileGridProps) {
  if (sessions.length === 0) return <p className="text-muted-foreground text-sm">No sessions yet.</p>

  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {sessions.map((session) => (
        <li key={session.uuid}>
          <SessionTile
            uuid={session.uuid}
            sessionType={session.sessionType}
            name={session.name}
            ownerEmail={session.ownerEmail}
            lastEditedAt={session.lastEditedAt}
            showActions={showActions}
            currentUserEmail={currentUserEmail}
            currentTeamId={currentTeamId}
            currentTeamName={currentTeamName}
            teams={teams}
          />
        </li>
      ))}
    </ul>
  )
}
