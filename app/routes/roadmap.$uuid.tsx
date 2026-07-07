import { useLoaderData } from 'react-router'

import { getAuthenticatedUser } from '~/auth/get-authenticated-user.server'
import { SessionItemsBulkDialog } from '~/components/items/SessionItemsBulkDialog'
import { RoadmapZones } from '~/components/roadmap/RoadmapZones'
import { RoadmapZonesDescriptor } from '~/components/roadmap/RoadmapZonesDescriptor'
import { SessionConnectionProvider } from '~/components/session/SessionConnectionContext'
import { SessionDetailProvider, useSessionDetail } from '~/components/session/SessionDetailContext'
import { SessionSettingsButton } from '~/components/session/SessionSettingsButton'
import { SessionShell } from '~/components/session/SessionShell'
import { handleSessionAction } from '~/data/session-actions.server'
import { loadSessionContext } from '~/data/session-loader.server'
import { useItems, useRoadmapZones, useTimelineSettings } from '~/hooks'
import type { Route } from './+types/roadmap.$uuid'

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
    sessionType: 'timeline',
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
    sessionType: 'timeline',
    formData,
    requestUrl: request.url,
  })
}

function RoadmapSessionContent() {
  const loaderData = useLoaderData<typeof loader>()
  const { isConnected, sessionUuid, userEmail, sessionName, canEdit, canManageSession, isLocked } =
    useSessionDetail()
  const canModify = canEdit && !isLocked

  const { items, createItem, updateItem, deleteItem } = useItems({
    sessionUuid,
    userEmail,
    initialItems: loaderData.items,
  })

  const { settings: timelineSettings } = useTimelineSettings({
    sessionUuid,
    initialSettings: loaderData.timelineSettings,
  })

  const { itemsByStatus, setItemStatus, reorderTimelineItems } = useRoadmapZones({
    sessionUuid,
    userEmail,
    initialItems: loaderData.items,
  })

  function handleBulkCreate(titles: string[]) {
    titles.forEach((title) => {
      if (title.trim()) createItem({ title: title.trim() })
    })
  }

  return (
    <SessionShell
      sessionType="timeline"
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
          {canEdit && <SessionSettingsButton sessionType="timeline" uuid={loaderData.uuid} />}
        </>
      }
      help={{
        title: 'Roadmap',
        description: 'Plan cycles on the long-term timeline.',
        sections: [
          RoadmapZonesDescriptor({
            isConnected,
            canReorder: canModify,
          }),
        ],
      }}
    >
      <RoadmapZones
        itemsByStatus={itemsByStatus}
        isConnected={isConnected && !isLocked}
        timelineSettings={timelineSettings ?? undefined}
        onSetItemStatus={setItemStatus}
        onReorderTimelineItems={reorderTimelineItems}
        onCreateItem={createItem}
        onUpdateItem={updateItem}
        onDeleteItem={deleteItem}
        onUpdateDurationWeeks={({ itemUuid, durationWeeks }) => {
          const item = items.find((i) => i.uuid === itemUuid)
          if (item) {
            updateItem({
              itemUuid,
              title: item.title,
              description: item.description || undefined,
              durationWeeks,
            })
          }
        }}
      />
    </SessionShell>
  )
}

export default function RoadmapSessionPage() {
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
        <RoadmapSessionContent />
      </SessionDetailProvider>
    </SessionConnectionProvider>
  )
}
