import type { SessionType } from 'roadmaps-agents/schemas'

import { CreateSessionOption } from './CreateSessionOption'

const sessionTypes = [
  'timeline',
  'dot_voting',
  'property_voting',
] as const satisfies readonly SessionType[]

type CreateSessionOptionsProps = {
  contextKey: string
  teamId?: string | null
}

export function CreateSessionOptions({
  contextKey,
  teamId,
}: CreateSessionOptionsProps) {
  return (
    <div className="create-session-bar">
      <span className="flex h-10 items-center px-3 text-sm font-bold text-foreground sm:border-r sm:border-border">
        Create new
      </span>

      <div className="flex flex-col divide-y divide-border sm:flex-row sm:divide-x sm:divide-y-0">
        {sessionTypes.map((type) => (
          <CreateSessionOption
            key={type}
            sessionType={type}
            contextKey={contextKey}
            teamId={teamId}
          />
        ))}
      </div>
    </div>
  )
}
