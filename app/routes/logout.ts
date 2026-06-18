import { redirect } from 'react-router'

import { destroyUserSession } from '../auth/session.server'
import type { Route } from './+types/logout'

export const action = async ({ request, context }: Route.ActionArgs) => {
  const cookie = await destroyUserSession(request, context.cloudflare.env)
  throw redirect('/login', { headers: { 'Set-Cookie': cookie } })
}

export const loader = async () => redirect('/login')
