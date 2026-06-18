import { useState } from 'react'
import type { RoadmapItem, VotingProperty } from 'roadmaps-agents/schemas'

import { ItemFormFields } from '~/components/items/ItemFormFields'
import { ItemActionsMenu } from '~/components/roadmap/ItemActionsMenu'
import { Button } from '~/components/ui/button'
import { PropertyVotingPropertyRow } from './property-voting-property-row'
import type { usePropertyVoteHelpers } from './use-property-vote-helpers'

type PropertyVotingItemProps = {
  item: RoadmapItem
  votingProperties: VotingProperty[]
  isConnected: boolean
  canEdit: boolean
  voteHelpers: ReturnType<typeof usePropertyVoteHelpers>
  onRemovePropertyVote: (propertyUuid: string, itemUuid: string) => void
  onUpdateItem?: (params: {
    itemUuid: string
    title: string
    description?: string
  }) => void
  onDeleteItem?: (itemUuid: string) => void
}

export function PropertyVotingItem({
  item,
  votingProperties,
  isConnected,
  canEdit,
  voteHelpers,
  onRemovePropertyVote,
  onUpdateItem,
  onDeleteItem,
}: PropertyVotingItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(item.title)
  const [editDescription, setEditDescription] = useState(item.description || '')

  function handleStartEdit() {
    setEditTitle(item.title)
    setEditDescription(item.description || '')
    setIsEditing(true)
  }

  function handleSaveEdit() {
    if (!editTitle.trim() || !onUpdateItem) return
    onUpdateItem({
      itemUuid: item.uuid,
      title: editTitle.trim(),
      description: editDescription.trim() || undefined,
    })
    setIsEditing(false)
  }

  return (
    <div className="mb-10">
      <div className="mb-4 border-l-4 border-gray-300 pl-3">
        <div className="flex items-start justify-between gap-2">
          {isEditing ? (
            <div className="flex-1 space-y-2">
              <ItemFormFields
                title={editTitle}
                description={editDescription}
                onTitleChange={setEditTitle}
                onDescriptionChange={setEditDescription}
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSaveEdit}
                  disabled={!editTitle.trim()}
                >
                  Save
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <div className="font-medium text-gray-900">{item.title}</div>
              {item.description && (
                <div className="text-sm text-gray-600">{item.description}</div>
              )}
            </div>
          )}
          {canEdit && onUpdateItem && onDeleteItem && !isEditing && (
            <ItemActionsMenu
              onEdit={handleStartEdit}
              onDelete={() => onDeleteItem(item.uuid)}
              isConnected={isConnected}
              itemUuid={item.uuid}
              externalContent={item.externalContent}
            />
          )}
        </div>
      </div>

      <div className="space-y-3">
        {votingProperties.map((property) => (
          <PropertyVotingPropertyRow
            key={property.uuid}
            itemUuid={item.uuid}
            property={property}
            isConnected={isConnected}
            voteHelpers={voteHelpers}
            onRemovePropertyVote={onRemovePropertyVote}
          />
        ))}
      </div>
    </div>
  )
}
