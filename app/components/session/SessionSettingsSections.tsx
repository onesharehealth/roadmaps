import { type ReactNode } from 'react'

import { SessionDeleteDangerZone } from './SessionDeleteDangerZone'
import { SessionSharing } from './SessionSharing'

type SessionSettingsSectionsProps = {
  children: ReactNode
}

export function SessionSettingsSections({
  children,
}: SessionSettingsSectionsProps) {
  return (
    <div className="grid gap-6">
      {children}
      <SessionSharing />
      <SessionDeleteDangerZone />
    </div>
  )
}
