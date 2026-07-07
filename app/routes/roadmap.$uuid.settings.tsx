import { useLoaderData } from 'react-router'

import { TimelineSettingsForm } from '~/components/roadmap/TimelineSettingsForm'
import { SessionConnectionProvider } from '~/components/session/SessionConnectionContext'
import { SessionDetailProvider, useSessionDetail } from '~/components/session/SessionDetailContext'
import { SessionLockSection } from '~/components/session/SessionLockSection'
import { SessionSettingsLayout } from '~/components/session/SessionSettingsLayout'
import { SessionSettingsSections } from '~/components/session/SessionSettingsSections'
import { handleSessionAction } from '~/data/session-actions.server'
import { loadSessionContext } from '~/data/session-loader.server'
import { useTimelineSettings } from '~/hooks'
import { userContext } from '~/middleware/auth'
import type { Route } from './+types/roadmap.$uuid.settings'

export const loader = async ({ params, context }: Route.LoaderArgs) => {
  const user = context.get(userContext)
  const data = await loadSessionContext({
    env: context.cloudflare.env,
    user,
    uuid: params.uuid!,
    sessionType: 'timeline',
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
    sessionType: 'timeline',
    formData,
    requestUrl: request.url,
  })
}

function RoadmapSettingsContent() {
  const data = useLoaderData<typeof loader>()
  const { isConnected, sessionUuid, canEdit } = useSessionDetail()

  const { settings: timelineSettings } = useTimelineSettings({
    sessionUuid,
    initialSettings: data.timelineSettings,
  })

  return (
    <SessionSettingsLayout backTo={`/roadmap/${data.uuid}`} title="Roadmap settings">
      <SessionSettingsSections>
        <TimelineSettingsForm settings={timelineSettings} isConnected={isConnected} canEdit={canEdit} />
        <SessionLockSection sessionUuid={data.uuid} initialLock={{ isLocked: data.isLocked, lockedAt: null }} />
      </SessionSettingsSections>
    </SessionSettingsLayout>
  )
}

export default function RoadmapSessionSettingsPage() {
  const data = useLoaderData<typeof loader>()

  return (
    <SessionConnectionProvider sessionType="timeline" uuid={data.uuid}>
      <SessionDetailProvider
        key={data.uuid}
        userEmail={data.user.email}
        session={data.session}
        sessionType="timeline"
        initialSessionName={data.session.name}
        canEdit={data.canEdit}
        canVote={data.canVote}
        canManageSession={data.canManageSession}
        initialIsLocked={data.isLocked}
        initialSharingInfo={data.sharingInfo}
      >
        <RoadmapSettingsContent />
      </SessionDetailProvider>
    </SessionConnectionProvider>
  )
}
