import type { DotVoteStats, RoadmapItem } from 'roadmaps-agents/schemas'

import { DotVotingItemCard } from '~/components/voting/DotVotingItemCard'

export type DotVotingItemGridProps = {
  items: RoadmapItem[]
  itemStats?: DotVoteStats[]
  onCastDotVote: (data: {
    itemUuid: string
    dotPositionX: number
    dotPositionY: number
  }) => void
  onRemoveDotVote: (data: {
    itemUuid: string
    dotPositionX: number
    dotPositionY: number
  }) => void
  isConnected: boolean
  hasRemainingVotes: boolean
  userEmail: string
  canEdit?: boolean
  onUpdateItem?: (params: {
    itemUuid: string
    title: string
    description?: string
    estimate?: number | null
  }) => void
  onDeleteItem?: (itemUuid: string) => void
}

export function DotVotingItemGrid({
  items,
  itemStats,
  onCastDotVote,
  onRemoveDotVote,
  isConnected,
  hasRemainingVotes,
  userEmail,
  canEdit,
  onUpdateItem,
  onDeleteItem,
}: DotVotingItemGridProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <DotVotingItemCard
          key={item.uuid}
          item={item}
          dotStats={itemStats?.find((s) => s.itemUuid === item.uuid)}
          onCastDotVote={onCastDotVote}
          onRemoveDotVote={onRemoveDotVote}
          isConnected={isConnected}
          hasRemainingVotes={hasRemainingVotes}
          userEmail={userEmail}
          canEdit={canEdit}
          onUpdateItem={onUpdateItem}
          onDeleteItem={onDeleteItem}
        />
      ))}
    </div>
  )
}
