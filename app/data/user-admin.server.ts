import type { RequiredEnvVars } from '../../env-required'
import { getSystemAgent, getTeamAgent, getUserAgent } from './agents.server'

export async function deactivateUser({ env, email }: { env: RequiredEnvVars; email: string }) {
  const system = await getSystemAgent(env)
  await system.setUserStatus(email, 'deactivated')

  const userAgent = await getUserAgent(env, email)
  await userAgent.revokeAccess({ reason: 'deactivated' })
}

export async function deleteUserCompletely({ env, email }: { env: RequiredEnvVars; email: string }) {
  const userAgent = await getUserAgent(env, email)
  await userAgent.revokeAccess({ reason: 'deleted' })

  const dashboard = await userAgent.getDashboard()
  const teamIds = dashboard.ok ? dashboard.body.teamIds : []

  await Promise.all(
    teamIds.map(async (teamId) => {
      const team = await getTeamAgent(env, teamId)
      await team.removeMember(email)
    }),
  )

  const system = await getSystemAgent(env)
  await system.deleteUser(email)
}
