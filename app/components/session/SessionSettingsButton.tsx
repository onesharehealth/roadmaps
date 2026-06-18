import { Link } from 'react-router'
import { Settings } from 'lucide-react'
import type { SessionType } from 'roadmaps-agents/schemas'

import { sessionPath } from '~/utils/sessions'

type SessionSettingsButtonProps = {
  sessionType: SessionType
  uuid: string
}

export function SessionSettingsButton({
  sessionType,
  uuid,
}: SessionSettingsButtonProps) {
  return (
    <Link
      to={`${sessionPath(sessionType, uuid)}/settings`}
      className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
    >
      <Settings size={16} />
      <span className="hidden sm:inline">Settings</span>
    </Link>
  )
}
