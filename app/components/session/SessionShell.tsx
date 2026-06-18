import { type ReactNode } from 'react'
import { Link } from 'react-router'
import type { SessionType } from 'roadmaps-agents/schemas'

import { SessionTypeIconBadge } from '~/components/home/SessionTypeIcon'
import { sessionTypeLabels } from '~/utils/sessions'
import { ConnectionStatus } from './ConnectionStatus'
import { SessionEditableTitle } from './SessionEditableTitle'
import { SessionHelpPopover } from './SessionHelpPopover'
import { SessionLocation } from './SessionLocation'
import type { SessionPageHeaderProps } from './SessionPageHeader'

type SessionShellProps = {
  sessionType: SessionType
  sessionName: string
  isOwner: boolean
  canRename?: boolean
  isConnected: boolean
  teamId: string | null
  currentTeamName: string | null
  teams: Array<{ id: string; name: string }>
  headerActions?: ReactNode
  help?: SessionPageHeaderProps
  /** Preset or explicit icon size in pixels for the header badge. Defaults to 32. */
  iconSize?: 'sm' | 'lg' | number
  /** Badge container size in pixels for the header icon. Defaults to 48. */
  iconBadgeSize?: number
  children: ReactNode
}

export function SessionShell({
  sessionType,
  sessionName,
  isOwner,
  canRename,
  isConnected,
  teamId,
  currentTeamName,
  teams,
  headerActions,
  help,
  iconSize = 24,
  iconBadgeSize = 36,
  children,
}: SessionShellProps) {
  const title = sessionName || sessionTypeLabels[sessionType]
  const showHeaderActions = headerActions || help

  return (
    <div className="page-session">
      <div className="mb-6">
        <Link
          to="/"
          className="link-back"
        >
          ← Home
        </Link>

        <div className="mt-4 sm:flex sm:items-start sm:justify-between sm:gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <SessionTypeIconBadge
              sessionType={sessionType}
              iconSize={iconSize}
              badgeSize={iconBadgeSize}
            />
            <div className="min-w-0">
              <SessionEditableTitle
                sessionName={title}
                canRename={canRename ?? isOwner}
              />
              <SessionLocation
                teamId={teamId}
                currentTeamName={currentTeamName}
                teams={teams}
                sessionName={sessionName}
                isOwner={isOwner}
                isConnected={isConnected}
              />
            </div>
          </div>
          {showHeaderActions && (
            <div className="mt-3 flex flex-wrap items-center justify-start gap-2 sm:mt-0 sm:shrink-0 sm:justify-end">
              {headerActions}
              {help && <SessionHelpPopover {...help} />}
            </div>
          )}
        </div>
      </div>

      <ConnectionStatus />

      {children}
    </div>
  )
}
