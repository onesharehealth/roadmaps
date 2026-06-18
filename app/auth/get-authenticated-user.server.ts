import { redirect } from 'react-router'

import type { RequiredEnvVars } from '../../env-required'
import { userContext } from '../middleware/auth'
import { destroyUserSession, getActiveSessionUser, type SessionUser } from './session.server'

type AuthContext = {
  get: (context: typeof userContext) => SessionUser
}

export async function getAuthenticatedUser({
  context,
  request,
  env,
}: {
  context: AuthContext
  request: Request
  env: RequiredEnvVars
}): Promise<SessionUser> {
  try {
    return context.get(userContext)
  } catch {
    const user = await getActiveSessionUser(request, env)
    if (!user) {
      const cookie = await destroyUserSession(request, env)
      throw redirect('/login', { headers: { 'Set-Cookie': cookie } })
    }
    return user
  }
}
