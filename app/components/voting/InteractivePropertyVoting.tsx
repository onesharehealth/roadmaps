import { Link } from 'react-router'
import type { CompletePropertyStats, RoadmapItem, VotingProperty } from 'roadmaps-agents/schemas'

import { ItemInlineCreate } from '~/components/items/ItemInlineCreate'
import { PropertyVotingItem } from './property-voting-item'
import type { ConnectedUser } from './use-property-vote-helpers'
import { usePropertyVoteHelpers } from './use-property-vote-helpers'

type InteractivePropertyVotingProps = {
  items: RoadmapItem[]
  votingProperties: VotingProperty[]
  userEmail: string
  isConnected: boolean
  isLocked?: boolean
  connectedUsers: ConnectedUser[]
  completePropertyStats: Record<string, CompletePropertyStats>
  onPropertyVote: (params: { propertyUuid: string; itemUuid: string; value: number }) => void
  onRemovePropertyVote: (propertyUuid: string, itemUuid: string) => void
  onGetCompletePropertyStats: (propertyUuid: string) => void
  canEdit?: boolean
  settingsUuid?: string
  requireAllVotersPresent?: boolean
  onCreateItem?: (params: { title: string; description?: string }) => void
  onUpdateItem?: (params: { itemUuid: string; title: string; description?: string }) => void
  onDeleteItem?: (itemUuid: string) => void
}

function PropertyVotingItemPreview({
  item,
  canEdit,
  onUpdateItem,
  onDeleteItem,
}: {
  item: RoadmapItem
  canEdit: boolean
  onUpdateItem?: InteractivePropertyVotingProps['onUpdateItem']
  onDeleteItem?: InteractivePropertyVotingProps['onDeleteItem']
}) {
  return (
    <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="border-l-4 border-gray-300 pl-3">
        <h3 className="text-base font-semibold text-gray-900">{item.title}</h3>
        {item.description && <p className="mt-1 text-sm text-gray-600">{item.description}</p>}
      </div>
      {canEdit && (onUpdateItem || onDeleteItem) && (
        <p className="mt-3 text-sm text-gray-500">Voting controls will appear after properties are configured.</p>
      )}
    </div>
  )
}

export function InteractivePropertyVoting({
  items,
  votingProperties,
  userEmail,
  isConnected,
  isLocked = false,
  connectedUsers,
  completePropertyStats,
  onPropertyVote,
  onRemovePropertyVote,
  onGetCompletePropertyStats,
  canEdit = false,
  settingsUuid,
  requireAllVotersPresent = true,
  onCreateItem,
  onUpdateItem,
  onDeleteItem,
}: InteractivePropertyVotingProps) {
  const votingEnabled = isConnected && !isLocked

  const voteHelpers = usePropertyVoteHelpers({
    votingProperties,
    userEmail,
    isConnected: votingEnabled,
    connectedUsers,
    completePropertyStats,
    onPropertyVote,
    onGetCompletePropertyStats,
    requireAllVotersPresent,
  })

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-6">
        <div className="text-center text-gray-500">
          <p>No roadmap items available for voting.</p>
        </div>
      </div>
    )
  }

  const sortedItems = [...items].sort((a, b) => a.displayOrder - b.displayOrder)
  const needsPropertySetup = votingProperties.length === 0

  return (
    <div>
      {needsPropertySetup && (
        <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-blue-900">
          <p className="text-sm font-medium">Items are ready, but voting can&apos;t start yet.</p>
          <p className="mt-1 text-sm text-blue-800">
            Add alignment properties in settings before participants can vote.
            {canEdit && settingsUuid && (
              <>
                {' '}
                <Link to={`/property-voting/${settingsUuid}/settings`} className="underline">
                  Open settings
                </Link>
              </>
            )}
          </p>
        </div>
      )}

      {canEdit && onCreateItem && <ItemInlineCreate isConnected={votingEnabled} onCreateItem={onCreateItem} />}

      <div className="space-y-6">
        {sortedItems.map((item) =>
          needsPropertySetup ? (
            <PropertyVotingItemPreview
              key={item.uuid}
              item={item}
              canEdit={canEdit}
              onUpdateItem={onUpdateItem}
              onDeleteItem={onDeleteItem}
            />
          ) : (
            <PropertyVotingItem
              key={item.uuid}
              item={item}
              votingProperties={votingProperties}
              isConnected={votingEnabled}
              canEdit={canEdit}
              voteHelpers={voteHelpers}
              onRemovePropertyVote={onRemovePropertyVote}
              onUpdateItem={onUpdateItem}
              onDeleteItem={onDeleteItem}
            />
          ),
        )}
      </div>

      {!isConnected && !needsPropertySetup && (
        <div className="mt-4 rounded-md bg-yellow-50 p-3">
          <p className="text-sm text-yellow-700">
            You are not connected to the server. Voting is temporarily disabled.
          </p>
        </div>
      )}
    </div>
  )
}
