import { Outlet, redirect, useLoaderData } from 'react-router'

import { destroyUserSession, getActiveSessionUser } from '../auth/session.server'
import { AccountSessionWatcher } from '../components/auth/account-session-watcher'
import { userContext } from '../middleware/auth'
import type { Route } from './+types/_app'

export const loader = async ({ context }: Route.LoaderArgs) => {
  const user = context.get(userContext)
  return { userEmail: user.email }
}

export const middleware: Route.MiddlewareFunction[] = [
  async ({ request, context }, next) => {
    const env = context.cloudflare.env
    const user = await getActiveSessionUser(request, env)
    if (!user) {
      const cookie = await destroyUserSession(request, env)
      throw redirect('/login', { headers: { 'Set-Cookie': cookie } })
    }
    if (user.mustChangePassword && !request.url.includes('/change-password')) {
      throw redirect('/change-password')
    }
    context.set(userContext, user)
    return next()
  },
]

export default function AppShell() {
  const { userEmail } = useLoaderData<typeof loader>()

  return (
    <div className="app-shell">
      <AccountSessionWatcher userEmail={userEmail} />
      <Outlet />
    </div>
  )
}
