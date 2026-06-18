import { Form, useActionData } from 'react-router'
import { sendEmail } from 'email'

import { getSystemAgent } from '../data/agents.server'
import type { Route } from './+types/forgot-password'

export const action = async ({ request, context }: Route.ActionArgs) => {
  const env = context.cloudflare.env

  const email = String((await request.formData()).get('email') ?? '')

  const system = await getSystemAgent(env)

  const user = await system.getUserByEmail(email)

  if (!user.ok || !user.body) return { success: true }

  const token = crypto.randomUUID()

  const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60

  await system.createPasswordResetToken({ token, email, expiresAt })

  const appUrl = env.APP_URL || new URL(request.url).origin

  await sendEmail(
    {
      to: email,

      subject: 'Reset your Roadmaps password',

      html: `<p><a href="${appUrl}/reset-password/${token}">Reset your password</a></p>`,

      text: `Reset your password: ${appUrl}/reset-password/${token}`,
    },

    env,
  )

  return { success: true }
}

export default function ForgotPasswordPage() {
  const actionData = useActionData<typeof action>()

  return (
    <div className="auth-shell">
      <div className="card auth-card">
        <h1 className="mb-4 text-2xl font-semibold">Forgot password</h1>

        {actionData?.success ? (
          <p className="text-sm text-muted-foreground">
            If an account exists, a reset link was sent.
          </p>
        ) : (
          <Form
            method="post"
            className="grid gap-4"
          >
            <input
              name="email"
              type="email"
              required
              placeholder="Email"
              className="field"
            />

            <button
              type="submit"
              className="btn btn-primary"
            >
              Send reset link
            </button>
          </Form>
        )}
      </div>
    </div>
  )
}
