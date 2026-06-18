import { redirect, useActionData, useLoaderData } from 'react-router'
import { hashPassword, validatePassword } from 'utils/password'

import { PasswordFormFields } from '~/components/auth/password-form-fields'
import { createUserSession, requireUser } from '../auth/session.server'
import { getSystemAgent } from '../data/agents.server'
import type { Route } from './+types/change-password'

export const loader = async ({ request, context }: Route.LoaderArgs) => {
  const env = context.cloudflare.env

  const user = await requireUser(request, env)

  return { email: user.email }
}

export const action = async ({ request, context }: Route.ActionArgs) => {
  const env = context.cloudflare.env

  const user = await requireUser(request, env)

  const formData = await request.formData()

  const password = String(formData.get('password') ?? '')
  const confirm = String(formData.get('confirm') ?? '')

  const validation = validatePassword({ password, confirm })
  if (!validation.ok) return { error: validation.error }

  const [system, passwordHash] = await Promise.all([getSystemAgent(env), hashPassword(password)])

  await system.updatePassword({
    email: user.email,
    passwordHash,
    clearMustChange: true,
  })

  const cookie = await createUserSession({
    request,
    env,
    user: { ...user, mustChangePassword: false },
  })

  throw redirect('/', { headers: { 'Set-Cookie': cookie } })
}

export default function ChangePasswordPage() {
  const { email } = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()

  return (
    <div className="auth-shell">
      <div className="card auth-card">
        <h1 className="mb-2 text-2xl font-semibold">Change password</h1>

        <p className="text-muted-foreground mb-6 text-sm">Signed in as {email}</p>

        <PasswordFormFields actionError={actionData?.error} submitLabel="Save password" />
      </div>
    </div>
  )
}
