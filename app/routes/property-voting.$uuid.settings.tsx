import { useLoaderData } from 'react-router'

import { SessionConnectionProvider } from '~/components/session/SessionConnectionContext'
import { SessionDetailProvider, useSessionDetail } from '~/components/session/SessionDetailContext'
import { SessionLockSection } from '~/components/session/SessionLockSection'
import { SessionSettingsLayout } from '~/components/session/SessionSettingsLayout'
import { SessionSettingsSection } from '~/components/session/SessionSettingsSection'
import { SessionSettingsSections } from '~/components/session/SessionSettingsSections'
import { PropertyVotingRulesSettings } from '~/components/voting/PropertyVotingRulesSettings'
import { VotingPropertiesManagement } from '~/components/voting/VotingPropertiesManagement'
import { handleSessionAction } from '~/data/session-actions.server'
import { loadSessionContext } from '~/data/session-loader.server'
import { useVotingProperties } from '~/hooks'
import { userContext } from '~/middleware/auth'
import type { Route } from './+types/property-voting.$uuid.settings'

export const loader = async ({ params, context }: Route.LoaderArgs) => {
  const user = context.get(userContext)
  const data = await loadSessionContext({
    env: context.cloudflare.env,
    user,
    uuid: params.uuid!,
    sessionType: 'property_voting',
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
    sessionType: 'property_voting',
    formData,
    requestUrl: request.url,
  })
}

function PropertyVotingSettingsContent() {
  const data = useLoaderData<typeof loader>()
  const { isConnected, sessionUuid, userEmail } = useSessionDetail()

  const {
    votingProperties,
    createVotingProperty,
    updateVotingProperty,
    deleteVotingProperty,
    reorderVotingProperties,
  } = useVotingProperties({
    sessionUuid,
    userEmail,
    initialVotingProperties: data.votingProperties,
  })

  return (
    <SessionSettingsLayout backTo={`/property-voting/${data.uuid}`} title="Alignment voting settings">
      <SessionSettingsSections>
        <SessionSettingsSection
          title="Alignment properties"
          description="Define the aspects participants rate for each item, such as impact or effort."
        >
          <VotingPropertiesManagement
            votingProperties={votingProperties}
            isConnected={isConnected}
            onCreateVotingProperty={createVotingProperty}
            onUpdateVotingProperty={updateVotingProperty}
            onDeleteVotingProperty={deleteVotingProperty}
            onReorderVotingProperties={reorderVotingProperties}
            embedded
          />
        </SessionSettingsSection>
        <PropertyVotingRulesSettings sessionUuid={data.uuid} initialSettings={data.propertyVotingSettings} />
        <SessionLockSection sessionUuid={data.uuid} initialLock={{ isLocked: data.isLocked, lockedAt: null }} />
      </SessionSettingsSections>
    </SessionSettingsLayout>
  )
}

export default function PropertyVotingSessionSettingsPage() {
  const data = useLoaderData<typeof loader>()

  return (
    <SessionConnectionProvider sessionType="property_voting" uuid={data.uuid}>
      <SessionDetailProvider
        key={data.uuid}
        userEmail={data.user.email}
        session={data.session}
        sessionType="property_voting"
        initialSessionName={data.session.name}
        canEdit={data.canEdit}
        canVote={data.canVote}
        canManageSession={data.canManageSession}
        initialIsLocked={data.isLocked}
        initialSharingInfo={data.sharingInfo}
      >
        <PropertyVotingSettingsContent />
      </SessionDetailProvider>
    </SessionConnectionProvider>
  )
}
