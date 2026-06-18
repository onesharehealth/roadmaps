export const homeContextKeys = ['drafts', 'shared', 'team'] as const

export type HomeContextKey = (typeof homeContextKeys)[number]

export type UserPrivateState = {
  settings?: Record<string, string>
}

export const userSettingsKeys = {
  homeContext: 'homeContext',
  homeTeamId: 'homeTeamId',
} as const

export const USER_ACCOUNT_EVENTS = {
  REVOKED: 'account:revoked',
} as const

export type UserAccountRevokeReason = 'deactivated' | 'deleted'

export type ResolvedHomeContext = {
  context: HomeContextKey
  teamId: string | null
}

function isHomeContextKey(value: string | undefined): value is HomeContextKey {
  return value !== undefined && homeContextKeys.includes(value as HomeContextKey)
}

export function resolveHomeContext({
  storedContext,
  storedTeamId,
  teamIds,
}: {
  storedContext?: string
  storedTeamId?: string | null
  teamIds: string[]
}): ResolvedHomeContext {
  if (!isHomeContextKey(storedContext)) {
    return { context: 'drafts', teamId: null }
  }

  if (storedContext === 'drafts' || storedContext === 'shared') {
    return { context: storedContext, teamId: null }
  }

  const teamId = storedTeamId && teamIds.includes(storedTeamId) ? storedTeamId : (teamIds[0] ?? null)

  if (!teamId) return { context: 'drafts', teamId: null }

  return { context: 'team', teamId }
}
