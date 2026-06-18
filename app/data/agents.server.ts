import { getAgentByName } from 'agents'
import type {
  DotVotingSessionAgent,
  PropertyVotingSessionAgent,
  SystemAgent,
  TeamAgent,
  TimelineSessionAgent,
  UserAgent,
} from 'roadmaps-agents'
import type { SessionType } from 'roadmaps-agents/schemas'

import type { RequiredEnvVars } from '../../env-required'

async function getAgent<T>(namespace: DurableObjectNamespace, name: string) {
  return (await getAgentByName(namespace as unknown as DurableObjectNamespace<never>, name)) as unknown as T
}

export function getSystemAgent(env: RequiredEnvVars) {
  return getAgent<SystemAgent>(env.SYSTEM_AGENT, 'system')
}

export function getUserAgent(env: RequiredEnvVars, email: string) {
  return getAgent<UserAgent>(env.USER_AGENT, email)
}

export function getTeamAgent(env: RequiredEnvVars, teamId: string) {
  return getAgent<TeamAgent>(env.TEAM_AGENT, teamId)
}

export function getTimelineSessionAgent(env: RequiredEnvVars, uuid: string) {
  return getAgent<TimelineSessionAgent>(env.TIMELINE_SESSION_AGENT, uuid)
}

export function getDotVotingSessionAgent(env: RequiredEnvVars, uuid: string) {
  return getAgent<DotVotingSessionAgent>(env.DOT_VOTING_SESSION_AGENT, uuid)
}

export function getPropertyVotingSessionAgent(env: RequiredEnvVars, uuid: string) {
  return getAgent<PropertyVotingSessionAgent>(env.PROPERTY_VOTING_SESSION_AGENT, uuid)
}

export function getSessionAgent(env: RequiredEnvVars, sessionType: SessionType, uuid: string) {
  switch (sessionType) {
    case 'timeline':
      return getTimelineSessionAgent(env, uuid)
    case 'dot_voting':
      return getDotVotingSessionAgent(env, uuid)
    case 'property_voting':
      return getPropertyVotingSessionAgent(env, uuid)
  }
}
