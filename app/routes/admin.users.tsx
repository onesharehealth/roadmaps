import { useMemo } from 'react'
import { Form, redirect, useLoaderData, useNavigation } from 'react-router'
import { platformInviteEmail, sendEmail } from 'email'

import { Button } from '~/components/ui/button'
import { requireAdmin } from '../auth/session.server'
import { PendingInviteRow } from '../components/admin/pending-invite-row'
import { UserAdminRow } from '../components/admin/user-admin-row'
import { getSystemAgent } from '../data/agents.server'
import {
  isAdminScopedInvite,
  loadAdminPendingInvites,
  resendPlatformInvite,
  revokeScopedInvite,
} from '../data/pending-invites.server'
import {
  activateUser,
  deactivateUser,
  deleteUserCompletely,
  demoteUserFromAdmin,
  getMaxAppAdmins,
  promoteUserToAdmin,
  toggleUserLinearImport,
} from '../data/user-admin.server'
import { getInviteExpiresAt } from '../utils/invite-expiry'
import { compareEmails } from '../utils/sort-by-email'
import type { Route } from './+types/admin.users'

export const loader = async ({ request, context }: Route.LoaderArgs) => {
  const admin = await requireAdmin(request, context.cloudflare.env)

  const system = await getSystemAgent(context.cloudflare.env)

  const users = await system.listUsers()
  const adminCount = await system.countAppAdmins()
  const pendingInvites = await loadAdminPendingInvites(system)

  return {
    currentUserEmail: admin.email,
    users: users.ok ? users.body : [],
    activeAdminCount: adminCount.ok ? adminCount.body : 0,
    maxAppAdmins: getMaxAppAdmins(context.cloudflare.env),
    pendingInvites,
  }
}

export const action = async ({ request, context }: Route.ActionArgs) => {
  const admin = await requireAdmin(request, context.cloudflare.env)

  const env = context.cloudflare.env

  const formData = await request.formData()

  const intent = String(formData.get('intent'))

  const system = await getSystemAgent(env)

  if (intent === 'invite') {
    const email = String(formData.get('email'))
    const role = formData.get('role') === 'app_admin' ? 'app_admin' : 'user'

    if (role === 'app_admin') {
      const count = await system.countAppAdmins()
      if (!count.ok) throw new Response('Failed to count app admins', { status: 500 })
      if (count.body >= getMaxAppAdmins(env)) {
        throw new Response(`Cannot have more than ${getMaxAppAdmins(env)} app admins`, { status: 400 })
      }
    }

    const token = crypto.randomUUID()
    const expiresAt = getInviteExpiresAt()

    await system.createInvite({
      token,
      email,
      invitedBy: admin.email,
      role,
      source: 'admin',
      expiresAt,
    })

    const appUrl = env.APP_URL || new URL(request.url).origin
    const inviteUrl = `${appUrl}/invite/${token}`
    const emailContent = platformInviteEmail({ inviteUrl, invitedByEmail: admin.email })

    await sendEmail(
      {
        to: email,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
      },
      env,
    )
  }

  if (intent === 'resend-invite') {
    await resendPlatformInvite({
      system,
      token: String(formData.get('token')),
      invitedByEmail: admin.email,
      env,
      requestUrl: request.url,
    })
  }

  if (intent === 'revoke-invite') {
    await revokeScopedInvite({
      system,
      token: String(formData.get('token')),
      isAllowed: isAdminScopedInvite,
    })
  }

  if (intent === 'deactivate') {
    await deactivateUser({ env, email: String(formData.get('email')) })
  }

  if (intent === 'promote-admin') {
    await promoteUserToAdmin({ env, email: String(formData.get('email')) })
  }

  if (intent === 'demote-admin') {
    await demoteUserFromAdmin({ env, email: String(formData.get('email')) })
  }

  if (intent === 'activate') {
    await activateUser({ env, email: String(formData.get('email')) })
  }

  if (intent === 'toggle-linear-import') {
    await toggleUserLinearImport({
      env,
      email: String(formData.get('email')),
      enabled: formData.get('enabled') === 'true',
    })
  }

  if (intent === 'delete') {
    if (formData.get('confirm') !== 'true') throw redirect('/admin/users')

    await deleteUserCompletely({ env, email: String(formData.get('email')) })
  }

  throw redirect('/admin/users')
}

export default function AdminUsersPage() {
  const { users, currentUserEmail, activeAdminCount, maxAppAdmins, pendingInvites } =
    useLoaderData<typeof loader>()
  const navigation = useNavigation()
  const isInviting = navigation.state === 'submitting' && navigation.formData?.get('intent') === 'invite'

  const listItems = useMemo(
    () =>
      [
        ...pendingInvites.map((invite) => ({ kind: 'invite' as const, invite })),
        ...users.map((user) => ({ kind: 'user' as const, user })),
      ].sort((a, b) =>
        compareEmails(
          a.kind === 'invite' ? a.invite.email : a.user.email,
          b.kind === 'invite' ? b.invite.email : b.user.email,
        ),
      ),
    [pendingInvites, users],
  )

  return (
    <div className="max-w-3xl">
      <h2 className="mb-2 text-xl font-semibold">Users</h2>
      <p className="text-muted-foreground mb-6 text-sm">
        Manage users and assign up to {maxAppAdmins} named app admin seats.
      </p>

      <Form method="post" className="mb-8 flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center">
        <input type="hidden" name="intent" value="invite" />

        <input name="email" type="email" required placeholder="Invite email" className="field flex-1" />

        <label className="text-muted-foreground flex shrink-0 items-center gap-2 text-sm">
          <input type="checkbox" name="role" value="app_admin" />
          Invite as app admin
        </label>

        <Button type="submit" className="shrink-0" disabled={isInviting}>
          {isInviting ? 'Sending…' : 'Invite'}
        </Button>
      </Form>

      <ul className="grid gap-3">
        {listItems.map((item) => {
          if (item.kind === 'invite') {
            return <PendingInviteRow key={item.invite.token} invite={item.invite} showRole />
          }

          const user = item.user

          return (
            <UserAdminRow
              key={user.email}
              user={user}
              currentUserEmail={currentUserEmail}
              activeAdminCount={activeAdminCount}
              maxAppAdmins={maxAppAdmins}
            />
          )
        })}
      </ul>
    </div>
  )
}
