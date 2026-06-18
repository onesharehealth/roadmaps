import { redirect, useActionData } from 'react-router'
import { hashPassword, validatePassword } from 'utils/password'

import { PasswordFormFields } from '~/components/auth/password-form-fields'
import { getSystemAgent } from '../data/agents.server'
import type { Route } from './+types/reset-password'

export const loader = async ({ params }: Route.LoaderArgs) => ({
  token: params.token,
})

export const action = async ({ request, context, params }: Route.ActionArgs) => {
  const env = context.cloudflare.env

  const formData = await request.formData()
  const password = String(formData.get('password') ?? '')
  const confirm = String(formData.get('confirm') ?? '')

  const validation = validatePassword({ password, confirm })
  if (!validation.ok) return { error: validation.error }

  const system = await getSystemAgent(env)

  const tokenResult = await system.consumePasswordResetToken(params.token!)

  if (!tokenResult.ok) return { error: tokenResult.errors.join(', ') }

  const passwordHash = await hashPassword(password)

  await system.updatePassword({ email: tokenResult.body.email, passwordHash })

  throw redirect('/login')
}

export default function ResetPasswordPage() {
  const actionData = useActionData<typeof action>()

  return (
    <div className="auth-shell">
      <div className="card auth-card">
        <h1 className="mb-4 text-2xl font-semibold">Reset password</h1>

        <PasswordFormFields actionError={actionData?.error} submitLabel="Reset password" />
      </div>
    </div>
  )
}
