import { Form } from 'react-router'
import type { SessionType } from 'roadmaps-agents/schemas'

import { getSessionOptionHoverStyle } from '~/utils/session-type-theme'
import { SessionTypeIcon } from './SessionTypeIcon'

const createOptionLabels = {
  timeline: 'roadmap',
  dot_voting: 'dot voting session',
  property_voting: 'alignment voting session',
} as const satisfies Record<SessionType, string>

type CreateSessionOptionProps = {
  sessionType: SessionType
  contextKey: string
  teamId?: string | null
}

export function CreateSessionOption({ sessionType, contextKey, teamId }: CreateSessionOptionProps) {
  const createContextKey = contextKey === 'shared' ? 'drafts' : contextKey

  return (
    <Form method="post">
      <input type="hidden" name="intent" value="create" />
      <input type="hidden" name="sessionType" value={sessionType} />
      <input type="hidden" name="contextKey" value={createContextKey} />
      {createContextKey === 'team' && teamId && <input type="hidden" name="teamId" value={teamId} />}

      <button type="submit" className="create-session-option" style={getSessionOptionHoverStyle(sessionType)}>
        <SessionTypeIcon sessionType={sessionType} size={20} />
        <span className="flex items-center whitespace-nowrap">{createOptionLabels[sessionType]}</span>
      </button>
    </Form>
  )
}
