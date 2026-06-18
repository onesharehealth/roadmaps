import type { SessionType } from 'roadmaps-agents/schemas'

import type { RequiredEnvVars } from '../../env-required'
import { getSessionAgent } from './agents.server'

export type SessionListEntry = {
  uuid: string
  sessionType: SessionType
  name: string
  ownerEmail: string
  createdAt?: number
  sharedAt?: number
}

export type EnrichedSessionListEntry = SessionListEntry & {
  lastEditedAt: number
}

function sessionListFallbackTimestamp(session: SessionListEntry) {
  return session.createdAt ?? session.sharedAt ?? 0
}

export async function enrichAndSortSessionList({
  env,
  sessions,
}: {
  env: RequiredEnvVars
  sessions: SessionListEntry[]
}) {
  const enriched = await Promise.all(
    sessions.map(async (session) => {
      const fallback = sessionListFallbackTimestamp(session)

      try {
        const agent = await getSessionAgent(env, session.sessionType, session.uuid)
        const result = await agent.getLastEditedAt()
        const contentLastEditedAt = result.ok ? result.body : null
        const lastEditedAt = contentLastEditedAt != null ? Math.max(contentLastEditedAt, fallback) : fallback

        return {
          ...session,
          lastEditedAt,
        }
      } catch {
        return {
          ...session,
          lastEditedAt: fallback,
        }
      }
    }),
  )

  return enriched.sort((a, b) => b.lastEditedAt - a.lastEditedAt)
}
