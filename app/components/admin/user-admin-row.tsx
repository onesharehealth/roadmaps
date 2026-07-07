import { Form, useNavigation } from 'react-router'
import type { ComponentProps } from 'react'

import { FloatingTooltip } from '~/components/roadmap/FloatingTooltip'
import { Button } from '~/components/ui/button'
import { DeleteUserButton } from './delete-user-button'

type AdminActionButtonProps = ComponentProps<typeof Button> & {
  disabledReason?: string
}

function AdminActionButton({ disabledReason, disabled, ...props }: AdminActionButtonProps) {
  const button = <Button disabled={disabled} {...props} />

  if (!disabled || !disabledReason) return button

  return (
    <FloatingTooltip content={disabledReason} placement="top" maxWidth={260}>
      <span className="inline-flex" tabIndex={0}>
        {button}
      </span>
    </FloatingTooltip>
  )
}

function useIsSubmittingForUser(intent: string, email: string) {
  const navigation = useNavigation()
  return (
    navigation.state === 'submitting' &&
    navigation.formData?.get('intent') === intent &&
    navigation.formData?.get('email') === email
  )
}

type UserAdminRowUser = {
  email: string
  role: 'app_admin' | 'user'
  status: 'active' | 'deactivated'
  linearImportEnabled: boolean
}

type UserAdminRowProps = {
  user: UserAdminRowUser
  currentUserEmail: string
  activeAdminCount: number
  maxAppAdmins: number
}

export function UserAdminRow({ user, currentUserEmail, activeAdminCount, maxAppAdmins }: UserAdminRowProps) {
  const isActiveAppAdmin = user.role === 'app_admin' && user.status === 'active'
  const isLastActiveAppAdmin = isActiveAppAdmin && activeAdminCount <= 1
  const isTogglingLinearImport = useIsSubmittingForUser('toggle-linear-import', user.email)
  const isChangingAdminRole =
    useIsSubmittingForUser('promote-admin', user.email) || useIsSubmittingForUser('demote-admin', user.email)
  const isChangingStatus =
    useIsSubmittingForUser('activate', user.email) || useIsSubmittingForUser('deactivate', user.email)

  const removeAdminDisabledReason = isLastActiveAppAdmin
    ? "You can't remove admin rights from the last active app admin. Promote another user to app admin first."
    : undefined
  const makeAdminDisabledReason =
    activeAdminCount >= maxAppAdmins
      ? `You've reached the maximum of ${maxAppAdmins} active app admins. Remove an admin before promoting another user.`
      : undefined
  const deactivateDisabledReason = isLastActiveAppAdmin
    ? "You can't deactivate the last active app admin. Promote another user to app admin first."
    : undefined
  const activateAdminDisabledReason =
    user.status !== 'active' && user.role === 'app_admin' && activeAdminCount >= maxAppAdmins
      ? `You've reached the maximum of ${maxAppAdmins} active app admins. Deactivate another app admin before activating this user.`
      : undefined
  const statusChangeDisabledReason =
    user.status === 'active' ? deactivateDisabledReason : activateAdminDisabledReason

  const linearImportDisabledReason =
    user.status !== 'active' ? 'Activate this user before enabling Linear import.' : undefined

  return (
    <li className="list-row flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2 font-medium">
          <span className="break-all">{user.email}</span>
          {user.email === currentUserEmail && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-normal">You</span>
          )}
          {user.role === 'app_admin' && (
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
              app admin
            </span>
          )}
          {user.status === 'active' && (user.role === 'app_admin' || user.linearImportEnabled) && (
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
              Linear import
            </span>
          )}
        </div>

        <div className="text-muted-foreground mt-1 text-xs">
          {user.role} · {user.status}
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap gap-2 sm:max-w-[32rem] sm:justify-end">
        {user.role !== 'app_admin' && (
          <Form method="post" className="inline-flex">
            <input type="hidden" name="email" value={user.email} />
            <input type="hidden" name="intent" value="toggle-linear-import" />
            <input type="hidden" name="enabled" value={user.linearImportEnabled ? 'false' : 'true'} />
            <AdminActionButton
              type="submit"
              variant="outline"
              size="sm"
              disabled={user.status !== 'active' || isTogglingLinearImport}
              disabledReason={linearImportDisabledReason}
            >
              {isTogglingLinearImport
                ? 'Updating…'
                : user.linearImportEnabled
                  ? 'Disable Linear import'
                  : 'Enable Linear import'}
            </AdminActionButton>
          </Form>
        )}

        {user.role === 'app_admin' ? (
          <Form method="post" className="inline-flex">
            <input type="hidden" name="email" value={user.email} />
            <input type="hidden" name="intent" value="demote-admin" />
            <AdminActionButton
              type="submit"
              variant="outline"
              size="sm"
              disabled={isLastActiveAppAdmin || isChangingAdminRole}
              disabledReason={removeAdminDisabledReason}
            >
              {isChangingAdminRole ? 'Updating…' : 'Remove admin'}
            </AdminActionButton>
          </Form>
        ) : (
          <Form method="post" className="inline-flex">
            <input type="hidden" name="email" value={user.email} />
            <input type="hidden" name="intent" value="promote-admin" />
            <AdminActionButton
              type="submit"
              variant="outline"
              size="sm"
              disabled={activeAdminCount >= maxAppAdmins || isChangingAdminRole}
              disabledReason={makeAdminDisabledReason}
            >
              {isChangingAdminRole ? 'Updating…' : 'Make admin'}
            </AdminActionButton>
          </Form>
        )}

        <Form method="post" className="inline-flex">
          <input type="hidden" name="email" value={user.email} />
          <input type="hidden" name="intent" value={user.status === 'active' ? 'deactivate' : 'activate'} />
          <AdminActionButton
            type="submit"
            variant="outline"
            size="sm"
            disabled={isLastActiveAppAdmin || !!activateAdminDisabledReason || isChangingStatus}
            disabledReason={statusChangeDisabledReason}
          >
            {isChangingStatus ? 'Updating…' : user.status === 'active' ? 'Deactivate' : 'Activate'}
          </AdminActionButton>
        </Form>

        <DeleteUserButton
          email={user.email}
          disabled={isLastActiveAppAdmin}
          disabledReason="You can't delete the last active app admin. Promote another user to app admin first."
        />
      </div>
    </li>
  )
}
