import { createCookieSessionStorage, redirect } from 'react-router'

import type { RequiredEnvVars } from '../../env-required'
import { getSystemAgent } from '../data/agents.server'

export type SessionUser = {
  email: string
  role: 'app_admin' | 'user'
  mustChangePassword: boolean
}

function getSessionStorage(env: RequiredEnvVars) {
  return createCookieSessionStorage<SessionUser>({
    cookie: {
      name: '__roadmaps_session',
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      secrets: [env.SESSION_SECRET],
      secure: env.ENVIRONMENT !== 'development',
      maxAge: 60 * 60 * 24 * 14,
    },
  })
}

async function getSessionUser(request: Request, env: RequiredEnvVars) {
  const storage = getSessionStorage(env)
  const session = await storage.getSession(request.headers.get('Cookie'))
  const email = session.get('email')
  if (!email) return null
  return {
    email,
    role: session.get('role') as SessionUser['role'],
    mustChangePassword: Boolean(session.get('mustChangePassword')),
  } satisfies SessionUser
}

export async function getActiveSessionUser(request: Request, env: RequiredEnvVars) {
  const sessionUser = await getSessionUser(request, env)
  if (!sessionUser) return null

  const system = await getSystemAgent(env)
  const userResult = await system.getUserByEmail(sessionUser.email)
  if (!userResult.ok || !userResult.body || userResult.body.status !== 'active') return null

  const user = userResult.body
  return {
    email: user.email,
    role: user.role,
    mustChangePassword: user.mustChangePassword,
  } satisfies SessionUser
}

export async function createUserSession({
  request,
  env,
  user,
}: {
  request: Request
  env: RequiredEnvVars
  user: SessionUser
}) {
  const storage = getSessionStorage(env)
  const session = await storage.getSession(request.headers.get('Cookie'))
  session.set('email', user.email)
  session.set('role', user.role)
  session.set('mustChangePassword', user.mustChangePassword)
  return storage.commitSession(session)
}

export async function destroyUserSession(request: Request, env: RequiredEnvVars) {
  const storage = getSessionStorage(env)
  const session = await storage.getSession(request.headers.get('Cookie'))
  return storage.destroySession(session)
}

export async function requireUser(request: Request, env: RequiredEnvVars) {
  const user = await getActiveSessionUser(request, env)
  if (!user) {
    const cookie = await destroyUserSession(request, env)
    throw redirect('/login', { headers: { 'Set-Cookie': cookie } })
  }
  return user
}

export async function requireAdmin(request: Request, env: RequiredEnvVars) {
  const user = await requireUser(request, env)
  if (user.role !== 'app_admin') throw redirect('/')
  return user
}
