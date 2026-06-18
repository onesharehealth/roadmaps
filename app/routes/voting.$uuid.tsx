import { useRef } from 'react'
import { useLoaderData } from 'react-router'
import type { RoadmapItem } from 'roadmaps-agents/schemas'
import { DEFAULT_DOT_VOTING_DOTS_PER_VOTER } from 'roadmaps-agents/schemas'

import { getAuthenticatedUser } from '~/auth/get-authenticated-user.server'
import { ItemInlineCreate } from '~/components/items/ItemInlineCreate'
import { SessionItemsBulkDialog } from '~/components/items/SessionItemsBulkDialog'
import { SessionConnectionProvider } from '~/components/session/SessionConnectionContext'
import { SessionDetailProvider, useSessionDetail } from '~/components/session/SessionDetailContext'
import { SessionSettingsButton } from '~/components/session/SessionSettingsButton'
import { SessionShell } from '~/components/session/SessionShell'
import { DotsSummaryVisualization } from '~/components/voting/DotsSummaryVisualization'
import { DotVotingItemGrid } from '~/components/voting/DotVotingItemGrid'
import { ItemFilterBar } from '~/components/voting/ItemFilterBar'
import { OutcomeDivider } from '~/components/voting/OutcomeDivider'
import { OutcomeModeButton } from '~/components/voting/OutcomeModeButton'
import { handleSessionAction } from '~/data/session-actions.server'
import { loadSessionContext } from '~/data/session-loader.server'
import { useDotVotes, useDotVotingSettings, useItemFilters, useItems, useOutcomeMode } from '~/hooks'
import type { Route } from './+types/voting.$uuid'

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
    sessionType: 'dot_voting',
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
    sessionType: 'dot_voting',
    formData,
    requestUrl: request.url,
  })
}

function DotVotingContent() {
  const loaderData = useLoaderData<typeof loader>()
  const { isConnected, sessionUuid, userEmail, sessionName, isOwner, canEdit, initialState } = useSessionDetail()

  const initialDotsPerVoter = loaderData.dotVotingSettings?.dotsPerVoter ?? DEFAULT_DOT_VOTING_DOTS_PER_VOTER

  const { items, createItem, updateItem, deleteItem } = useItems({
    sessionUuid,
    userEmail,
    initialItems: loaderData.items,
  })

  const { castDotVote, removeDotVote, completeDotStats } = useDotVotes({
    sessionUuid,
    userEmail,
    initialStats: initialState?.dotVoteStats,
  })

  const { settings: dotVotingSettings } = useDotVotingSettings({
    sessionUuid,
    initialSettings: loaderData.dotVotingSettings,
  })

  const {
    filteredItems,
    availableTags,
    availableEstimates,
    tagColorMap,
    selectedTags,
    selectedEstimates,
    showOnlyWithVotes,
    toggleTag,
    toggleEstimate,
    toggleShowOnlyWithVotes,
    clearFilters,
    isFiltered,
  } = useItemFilters(items, completeDotStats?.itemStats)

  const { isOutcomeMode, toggleOutcomeMode, itemsWithVotes, itemsWithoutVotes } = useOutcomeMode({
    items,
    completeDotStats,
  })

  const getVoteCount = (item: RoadmapItem) => {
    const itemStats = completeDotStats?.itemStats.find((s) => s.itemUuid === item.uuid)
    return itemStats?.totalVotes ?? 0
  }

  const sortedItemsWithVotes = isOutcomeMode
    ? [...itemsWithVotes].sort((a, b) => getVoteCount(b) - getVoteCount(a))
    : itemsWithVotes

  const sortedItemsWithoutVotes = isOutcomeMode
    ? [...itemsWithoutVotes].sort((a, b) => getVoteCount(a) - getVoteCount(b))
    : itemsWithoutVotes

  const savedFiltersRef = useRef<{
    selectedTags: Set<string>
    selectedEstimates: Set<string>
    showOnlyWithVotes: boolean
  } | null>(null)

  const userTotalVotes = completeDotStats
    ? completeDotStats.itemStats.reduce((total, itemStat) => {
        const userVotes = itemStat.votes.filter((v) => v.username === userEmail)
        return total + userVotes.length
      }, 0)
    : 0

  const dotsPerVoter = dotVotingSettings?.dotsPerVoter ?? completeDotStats?.dotsPerVoter ?? initialDotsPerVoter
  const userRemainingVotes = Math.max(0, dotsPerVoter - userTotalVotes)

  const displayItems = isOutcomeMode ? items : filteredItems
  const sortedItems = [...displayItems].sort((a, b) => a.displayOrder - b.displayOrder)

  const handleToggleOutcomeMode = () => {
    if (isOutcomeMode) {
      if (savedFiltersRef.current) {
        clearFilters()
        savedFiltersRef.current.selectedTags.forEach((tag) => toggleTag(tag))
        savedFiltersRef.current.selectedEstimates.forEach((estimate) => toggleEstimate(estimate))
        if (savedFiltersRef.current.showOnlyWithVotes) toggleShowOnlyWithVotes()
      }
    } else {
      savedFiltersRef.current = {
        selectedTags: new Set(selectedTags),
        selectedEstimates: new Set(selectedEstimates),
        showOnlyWithVotes,
      }
      clearFilters()
    }
    toggleOutcomeMode()
  }

  function handleBulkCreate(titles: string[]) {
    titles.forEach((title) => {
      if (title.trim()) createItem({ title: title.trim() })
    })
  }

  const itemGridProps = {
    itemStats: completeDotStats?.itemStats,
    onCastDotVote: castDotVote,
    onRemoveDotVote: removeDotVote,
    isConnected,
    hasRemainingVotes: userRemainingVotes > 0,
    userEmail,
    canEdit,
    onUpdateItem: updateItem,
    onDeleteItem: deleteItem,
  }

  return (
    <SessionShell
      sessionType="dot_voting"
      sessionName={sessionName ?? loaderData.session.name}
      isOwner={isOwner}
      isConnected={isConnected}
      teamId={loaderData.session.teamId}
      currentTeamName={loaderData.currentTeamName}
      teams={loaderData.teams}
      headerActions={
        <>
          {canEdit && (
            <SessionItemsBulkDialog
              items={items}
              linearEnabled={loaderData.linearEnabled}
              aiEnabled={loaderData.aiEnabled}
              onBulkCreate={handleBulkCreate}
            />
          )}
          <OutcomeModeButton
            isOutcomeMode={isOutcomeMode}
            onClick={handleToggleOutcomeMode}
            userTotalVotes={userTotalVotes}
            dotsPerVoter={dotsPerVoter}
          />
          {canEdit && <SessionSettingsButton sessionType="dot_voting" uuid={loaderData.uuid} />}
        </>
      }
      help={{
        title: 'Dot Voting',
        description: 'Allocate a limited number of votes across items to prioritize them.',
      }}
    >
      <div className="mb-6 flex justify-center">
        <DotsSummaryVisualization total={dotsPerVoter} used={userTotalVotes} />
      </div>

      {!isOutcomeMode && (availableTags.length > 0 || availableEstimates.length > 0) && (
        <ItemFilterBar
          availableTags={availableTags}
          availableEstimates={availableEstimates}
          tagColorMap={tagColorMap}
          selectedTags={selectedTags}
          selectedEstimates={selectedEstimates}
          showOnlyWithVotes={showOnlyWithVotes}
          onToggleTag={toggleTag}
          onToggleEstimate={toggleEstimate}
          onToggleShowOnlyWithVotes={toggleShowOnlyWithVotes}
          onClearFilters={clearFilters}
          isFiltered={isFiltered}
          filteredCount={sortedItems.length}
          totalCount={items.length}
        />
      )}

      {canEdit && items.length > 0 && <ItemInlineCreate isConnected={isConnected} onCreateItem={createItem} />}

      {sortedItems.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-12 text-center text-gray-500">
          <p className="text-lg font-medium">No items yet</p>
          <p className="mt-2 text-sm">
            Use <strong>Add items</strong> to import from Linear or paste multiple titles.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {isOutcomeMode ? (
            <>
              <div className="rounded-lg bg-green-100 p-6">
                <h3 className="mb-4 text-lg font-semibold text-gray-800">
                  Items with Votes ({sortedItemsWithVotes.length})
                </h3>
                <DotVotingItemGrid items={sortedItemsWithVotes} {...itemGridProps} />
              </div>
              {sortedItemsWithoutVotes.length > 0 && <OutcomeDivider />}
              {sortedItemsWithoutVotes.length > 0 && (
                <div className="rounded-lg bg-gray-200 p-6">
                  <h3 className="mb-4 text-lg font-semibold text-gray-800">
                    Other Items ({sortedItemsWithoutVotes.length})
                  </h3>
                  <DotVotingItemGrid items={sortedItemsWithoutVotes} {...itemGridProps} />
                </div>
              )}
            </>
          ) : (
            <DotVotingItemGrid items={sortedItems} {...itemGridProps} />
          )}
        </div>
      )}
    </SessionShell>
  )
}

export default function VotingSessionPage() {
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
        isOwner={data.isOwner}
        initialSharingInfo={data.sharingInfo}
      >
        <DotVotingContent />
      </SessionDetailProvider>
    </SessionConnectionProvider>
  )
}
