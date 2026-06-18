import type {
  CompletePropertyStats,
  RoadmapItem,
  VotingProperty,
} from 'roadmaps-agents/schemas'

import { ItemInlineCreate } from '~/components/items/ItemInlineCreate'
import { PropertyVotingItem } from './property-voting-item'
import type { ConnectedUser } from './use-property-vote-helpers'
import { usePropertyVoteHelpers } from './use-property-vote-helpers'

type InteractivePropertyVotingProps = {
  items: RoadmapItem[]
  votingProperties: VotingProperty[]
  userEmail: string
  isConnected: boolean
  connectedUsers: ConnectedUser[]
  completePropertyStats: Record<string, CompletePropertyStats>
  onPropertyVote: (params: {
    propertyUuid: string
    itemUuid: string
    value: number
  }) => void
  onRemovePropertyVote: (propertyUuid: string, itemUuid: string) => void
  onGetCompletePropertyStats: (propertyUuid: string) => void
  canEdit?: boolean
  onCreateItem?: (params: { title: string; description?: string }) => void
  onUpdateItem?: (params: {
    itemUuid: string
    title: string
    description?: string
  }) => void
  onDeleteItem?: (itemUuid: string) => void
}

export function InteractivePropertyVoting({
  items,
  votingProperties,
  userEmail,
  isConnected,
  connectedUsers,
  completePropertyStats,
  onPropertyVote,
  onRemovePropertyVote,
  onGetCompletePropertyStats,
  canEdit = false,
  onCreateItem,
  onUpdateItem,
  onDeleteItem,
}: InteractivePropertyVotingProps) {
  const voteHelpers = usePropertyVoteHelpers({
    votingProperties,
    userEmail,
    isConnected,
    connectedUsers,
    completePropertyStats,
    onPropertyVote,
    onGetCompletePropertyStats,
  })

  if (items.length === 0 || votingProperties.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-6">
        <div className="text-center text-gray-500">
          {items.length === 0 ? (
            <p>No roadmap items available for voting.</p>
          ) : (
            <p>
              No voting properties available. Create a property first to enable
              voting.
            </p>
          )}
        </div>
      </div>
    )
  }

  const sortedItems = [...items].sort((a, b) => a.displayOrder - b.displayOrder)

  return (
    <div>
      {canEdit && onCreateItem && (
        <ItemInlineCreate
          isConnected={isConnected}
          onCreateItem={onCreateItem}
        />
      )}

      <div className="space-y-6">
        {sortedItems.map((item) => (
          <PropertyVotingItem
            key={item.uuid}
            item={item}
            votingProperties={votingProperties}
            isConnected={isConnected}
            canEdit={canEdit}
            voteHelpers={voteHelpers}
            onRemovePropertyVote={onRemovePropertyVote}
            onUpdateItem={onUpdateItem}
            onDeleteItem={onDeleteItem}
          />
        ))}
      </div>

      {!isConnected && (
        <div className="mt-4 rounded-md bg-yellow-50 p-3">
          <p className="text-sm text-yellow-700">
            You are not connected to the server. Voting is temporarily disabled.
          </p>
        </div>
      )}
    </div>
  )
}
