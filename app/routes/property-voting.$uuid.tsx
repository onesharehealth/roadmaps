import { useLoaderData } from 'react-router'

import { getAuthenticatedUser } from '~/auth/get-authenticated-user.server'
import { SessionItemsBulkDialog } from '~/components/items/SessionItemsBulkDialog'
import { SessionConnectionProvider } from '~/components/session/SessionConnectionContext'
import { SessionDetailProvider, useSessionDetail } from '~/components/session/SessionDetailContext'
import { SessionSettingsButton } from '~/components/session/SessionSettingsButton'
import { SessionShell } from '~/components/session/SessionShell'
import { InteractivePropertyVoting } from '~/components/voting/InteractivePropertyVoting'
import { handleSessionAction } from '~/data/session-actions.server'
import { loadSessionContext } from '~/data/session-loader.server'
import { useItems, usePropertyVotes, usePropertyVotingSettings, useVotingProperties } from '~/hooks'
import type { Route } from './+types/property-voting.$uuid'

export const loader = async ({ params, context, request }: Route.LoaderArgs) => {
  const user = await getAuthenticatedUser({
    context,
    request,
    env: context.cloudflare.env,
  })
  return loadSessionContext({
    env: context.cloudflare.env,
    user,
    uuid: params.uuid!,
    sessionType: 'property_voting',
  })
}

export const action = async ({ request, context, params }: Route.ActionArgs) => {
  const user = await getAuthenticatedUser({
    context,
    request,
    env: context.cloudflare.env,
  })
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

function PropertyVotingContent() {
  const loaderData = useLoaderData<typeof loader>()
  const {
    isConnected,
    connectedUsers,
    sessionUuid,
    userEmail,
    sessionName,
    canManageSession,
    canEdit,
    isLocked,
  } = useSessionDetail()

  const canModify = canEdit && !isLocked
  const settingsUuid = loaderData.uuid

  const { items, createItem, updateItem, deleteItem } = useItems({
    sessionUuid,
    userEmail,
    initialItems: loaderData.items,
  })

  const { votingProperties } = useVotingProperties({
    sessionUuid,
    userEmail,
    initialVotingProperties: loaderData.votingProperties,
  })

  const { settings: propertyVotingSettings } = usePropertyVotingSettings({
    sessionUuid,
    initialSettings: loaderData.propertyVotingSettings,
  })

  const { castPropertyVote, removePropertyVote, getCompletePropertyStats, completePropertyStats } =
    usePropertyVotes({
      sessionUuid,
    })

  function handleBulkCreate(titles: string[]) {
    titles.forEach((title) => {
      if (title.trim()) createItem({ title: title.trim() })
    })
  }

  return (
    <SessionShell
      sessionType="property_voting"
      sessionName={sessionName ?? loaderData.session.name}
      canManageSession={canManageSession}
      isConnected={isConnected}
      isLocked={isLocked}
      teamId={loaderData.session.teamId}
      currentTeamName={loaderData.currentTeamName}
      teams={loaderData.teams}
      headerActions={
        <>
          {canModify && (
            <SessionItemsBulkDialog
              items={items}
              linearEnabled={loaderData.linearEnabled}
              aiEnabled={loaderData.aiEnabled}
              onBulkCreate={handleBulkCreate}
            />
          )}
          {canEdit && <SessionSettingsButton sessionType="property_voting" uuid={loaderData.uuid} />}
        </>
      }
      help={{
        title: 'Alignment Voting',
        description: 'Rate different aspects of each issue to see where stakeholders align.',
      }}
    >
      {items.length === 0 ? (
        <div className="mx-auto max-w-[720px] rounded-lg border border-gray-200 bg-gray-50 p-6 text-center text-gray-500">
          <p>No items available for voting.</p>
          {canModify && (
            <p className="mt-2 text-sm">
              Use <strong>Add items</strong> to import from Linear or paste multiple titles.
            </p>
          )}
        </div>
      ) : (
        <div className="mx-auto max-w-[720px]">
          <InteractivePropertyVoting
            items={items}
            votingProperties={votingProperties}
            userEmail={userEmail}
            isConnected={isConnected}
            isLocked={isLocked}
            connectedUsers={connectedUsers}
            completePropertyStats={completePropertyStats}
            onPropertyVote={castPropertyVote}
            onRemovePropertyVote={removePropertyVote}
            onGetCompletePropertyStats={getCompletePropertyStats}
            canEdit={canModify}
            settingsUuid={settingsUuid}
            requireAllVotersPresent={propertyVotingSettings.requireAllVotersPresent}
            onCreateItem={createItem}
            onUpdateItem={updateItem}
            onDeleteItem={deleteItem}
          />
        </div>
      )}
    </SessionShell>
  )
}

export default function PropertyVotingSessionPage() {
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
        <PropertyVotingContent />
      </SessionDetailProvider>
    </SessionConnectionProvider>
  )
}
