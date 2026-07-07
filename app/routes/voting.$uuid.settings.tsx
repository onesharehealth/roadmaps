import { useLoaderData } from 'react-router'

import { SessionConnectionProvider } from '~/components/session/SessionConnectionContext'
import { SessionDetailProvider } from '~/components/session/SessionDetailContext'
import { SessionLockSection } from '~/components/session/SessionLockSection'
import { SessionSettingsLayout } from '~/components/session/SessionSettingsLayout'
import { SessionSettingsSections } from '~/components/session/SessionSettingsSections'
import { DotVotingSettingsComponent } from '~/components/voting/DotVotingSettingsComponent'
import { handleSessionAction } from '~/data/session-actions.server'
import { loadSessionContext } from '~/data/session-loader.server'
import { userContext } from '~/middleware/auth'
import type { Route } from './+types/voting.$uuid.settings'

export const loader = async ({ params, context }: Route.LoaderArgs) => {
  const user = context.get(userContext)
  const data = await loadSessionContext({
    env: context.cloudflare.env,
    user,
    uuid: params.uuid!,
    sessionType: 'dot_voting',
  })

  if (!data.canEdit) throw new Response('Forbidden', { status: 403 })

  return data
}

export const action = async ({ request, context, params }: Route.ActionArgs) => {
  const user = context.get(userContext)
  const formData = await request.formData()
  return handleSessionAction({
    env: context.cloudflare.env,
    user,
    uuid: params.uuid!,
    sessionType: 'dot_voting',
    formData,
    requestUrl: request.url,
  })
}

export default function VotingSessionSettingsPage() {
  const data = useLoaderData<typeof loader>()

  return (
    <SessionConnectionProvider sessionType="dot_voting" uuid={data.uuid}>
      <SessionDetailProvider
        key={data.uuid}
        userEmail={data.user.email}
        session={data.session}
        sessionType="dot_voting"
        initialSessionName={data.session.name}
        canEdit={data.canEdit}
        canVote={data.canVote}
        canManageSession={data.canManageSession}
        initialIsLocked={data.isLocked}
        initialSharingInfo={data.sharingInfo}
      >
        <SessionSettingsLayout backTo={`/voting/${data.uuid}`} title="Dot voting settings">
          <SessionSettingsSections>
            <DotVotingSettingsComponent sessionUuid={data.uuid} initialSettings={data.dotVotingSettings} />
            <SessionLockSection
              sessionUuid={data.uuid}
              initialLock={{ isLocked: data.isLocked, lockedAt: null }}
            />
          </SessionSettingsSections>
        </SessionSettingsLayout>
      </SessionDetailProvider>
    </SessionConnectionProvider>
  )
}
