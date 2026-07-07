import type {
  DotVotingSettings,
  PropertyVotingSettings,
  RoadmapItem,
  RoadmapTimelineSettings,
  SessionPublicState,
  SessionType,
  SharingInfo,
  VotingProperty,
} from 'roadmaps-agents/schemas'

import type { RequiredEnvVars } from '../../env-required'
import type { SessionUser } from '../auth/session.server'
import {
  getDotVotingSessionAgent,
  getPropertyVotingSessionAgent,
  getSessionAgent,
  getSystemAgent,
  getTeamAgent,
  getTimelineSessionAgent,
  getUserAgent,
} from './agents.server'

type LoadSessionContextArgs = {
  env: RequiredEnvVars
  user: SessionUser
  uuid: string
  sessionType: SessionType
}

export type SessionLoaderData = {
  uuid: string
  sessionType: SessionType
  session: SessionPublicState
  items: RoadmapItem[]
  teams: Array<{ id: string; name: string }>
  currentTeamName: string | null
  linearEnabled: boolean
  aiEnabled: boolean
  sharingInfo: SharingInfo
  timelineSettings: RoadmapTimelineSettings | null
  dotVotingSettings: DotVotingSettings | null
  propertyVotingSettings: PropertyVotingSettings | null
  votingProperties: VotingProperty[]
  isLocked: boolean
  canEdit: boolean
  canVote: boolean
  canManageSession: boolean
  user: SessionUser
}

async function userHasLinearImport(env: RequiredEnvVars, email: string) {
  const system = await getSystemAgent(env)
  const user = await system.getUserByEmail(email)
  return user.ok && Boolean(user.body?.linearImportEnabled)
}

export async function loadSessionContext({
  env,
  user,
  uuid,
  sessionType,
}: LoadSessionContextArgs): Promise<SessionLoaderData> {
  const agent = await getSessionAgent(env, sessionType, uuid)
  type SessionAgentLike = {
    state: unknown
    getAllItems: (args: { userId: string }) => Promise<{ ok: boolean; body?: RoadmapItem[] }>
    getSharingInfo: (args?: { userId?: string }) => Promise<{ ok: boolean; body?: SharingInfo }>
    checkAccess: (args: { userId: string }) => Promise<{
      ok: boolean
      body?: {
        hasAccess: boolean
        canEdit: boolean
        canVote: boolean
        canManageSession: boolean
        isLocked: boolean
        permission: 'read' | 'write' | null
      }
    }>
  }
  const sessionAgent = agent as unknown as SessionAgentLike

  const accessResult = await sessionAgent.checkAccess({ userId: user.email })
  if (!accessResult.ok || !accessResult.body?.hasAccess) throw new Response('Forbidden', { status: 403 })
  const access = accessResult.body

  const session = (await sessionAgent.state) as SessionPublicState
  if (!session?.uuid || !session.ownerEmail) {
    throw new Response('Session not found', { status: 404 })
  }

  const itemsResult = await sessionAgent.getAllItems({ userId: user.email })
  const items = itemsResult.ok ? (itemsResult.body as RoadmapItem[]) : []

  const userAgent = await getUserAgent(env, user.email)
  const dashboard = await userAgent.getDashboard()
  const teams = dashboard.ok
    ? await Promise.all(
        dashboard.body.teamIds.map(async (id) => {
          const team = await getTeamAgent(env, id)
          const teamData = await team.getTeamData()
          return {
            id,
            name: teamData.ok && teamData.body.name ? String(teamData.body.name) : id,
          }
        }),
      )
    : []

  const linearEnabled =
    Boolean(env.LINEAR_API_KEY) && (user.role === 'app_admin' || (await userHasLinearImport(env, user.email)))

  const sharingResult = await sessionAgent.getSharingInfo({
    userId: user.email,
  })
  const sharingInfo: SharingInfo =
    sharingResult.ok && sharingResult.body
      ? sharingResult.body
      : { ownerEmail: session.ownerEmail, sharedWith: [] }

  const timelineSettingsResult =
    sessionType === 'timeline'
      ? await (
          (await getTimelineSessionAgent(env, uuid)) as {
            getTimelineSettings: (args: {
              userId: string
            }) => Promise<{ ok: boolean; body?: RoadmapTimelineSettings }>
          }
        ).getTimelineSettings({ userId: user.email })
      : null
  const timelineSettings = timelineSettingsResult?.ok ? (timelineSettingsResult.body ?? null) : null

  const dotVotingSettingsResult =
    sessionType === 'dot_voting'
      ? await (
          (await getDotVotingSessionAgent(env, uuid)) as {
            getDotVotingSettings: (args: { userId: string }) => Promise<{ ok: boolean; body?: DotVotingSettings }>
          }
        ).getDotVotingSettings({ userId: user.email })
      : null
  const dotVotingSettings = dotVotingSettingsResult?.ok ? (dotVotingSettingsResult.body ?? null) : null

  const votingPropertiesResult =
    sessionType === 'property_voting'
      ? await (
          (await getPropertyVotingSessionAgent(env, uuid)) as {
            getAllVotingProperties: (args: { userId: string }) => Promise<{
              ok: boolean
              body?: VotingProperty[]
            }>
          }
        ).getAllVotingProperties({ userId: user.email })
      : null
  const votingProperties = votingPropertiesResult?.ok ? (votingPropertiesResult.body ?? []) : []

  const propertyVotingSettingsResult =
    sessionType === 'property_voting'
      ? await (
          (await getPropertyVotingSessionAgent(env, uuid)) as {
            getPropertyVotingSettings: (args: {
              userId: string
            }) => Promise<{ ok: boolean; body?: PropertyVotingSettings }>
          }
        ).getPropertyVotingSettings({ userId: user.email })
      : null
  const propertyVotingSettings = propertyVotingSettingsResult?.ok
    ? (propertyVotingSettingsResult.body ?? null)
    : null

  let currentTeamName: string | null = null
  if (session.teamId) {
    const team = await getTeamAgent(env, session.teamId)
    const teamData = await team.getTeamData()
    currentTeamName = teamData.ok && teamData.body.name ? String(teamData.body.name) : session.teamId
  }

  return {
    uuid,
    sessionType,
    session,
    items,
    teams,
    currentTeamName,
    linearEnabled,
    aiEnabled: Boolean(env.AI_PROVIDER),
    sharingInfo,
    timelineSettings,
    dotVotingSettings,
    propertyVotingSettings,
    votingProperties,
    isLocked: access.isLocked,
    canEdit: access.canEdit,
    canVote: access.canVote,
    canManageSession: access.canManageSession,
    user,
  }
}
