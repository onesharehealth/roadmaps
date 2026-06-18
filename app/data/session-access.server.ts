import type { getSessionAgent } from './agents.server'

type SessionAgentLike = Awaited<ReturnType<typeof getSessionAgent>>

type SessionAccessCheckAgent = {
  checkAccess: (args: { userId: string }) => Promise<{
    ok: boolean
    body: {
      hasAccess: boolean
      canEdit: boolean
      isOwner: boolean
      permission: 'read' | 'write' | null
    }
  }>
}

export type SessionAccessTier = 'read' | 'edit' | 'owner'

export async function requireSessionAccessTier({
  agent,
  userId,
  tier,
}: {
  agent: SessionAgentLike
  userId: string
  tier: SessionAccessTier
}) {
  const result = await (agent as SessionAccessCheckAgent).checkAccess({ userId })
  if (!result.ok) throw new Response('Forbidden', { status: 403 })

  const { hasAccess, canEdit, isOwner } = result.body
  const allowed = tier === 'read' ? hasAccess : tier === 'edit' ? canEdit : isOwner

  if (!allowed) throw new Response('Forbidden', { status: 403 })
}
