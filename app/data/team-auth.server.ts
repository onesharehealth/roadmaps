import type { RequiredEnvVars } from '../../env-required'
import { getTeamAgent } from './agents.server'

export async function requireTeamMember({
  env,
  teamId,
  userId,
}: {
  env: RequiredEnvVars
  teamId: string
  userId: string
}) {
  const team = await getTeamAgent(env, teamId)
  const isMember = await team.isMember(userId)
  if (!isMember) throw new Response('Forbidden', { status: 403 })
  return team
}

export async function requireTeamAdmin({
  env,
  teamId,
  userId,
}: {
  env: RequiredEnvVars
  teamId: string
  userId: string
}) {
  const team = await requireTeamMember({ env, teamId, userId })
  const role = await team.getMemberRole(userId)
  if (role !== 'admin') throw new Response('Forbidden', { status: 403 })
  return team
}
