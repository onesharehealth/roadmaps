import React, { useEffect, useRef, useState } from 'react'
import { draggable, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter'
import { GripVertical, Save, X } from 'lucide-react'
import { VotingProperty } from 'roadmaps-agents/schemas'

import { ItemActionsMenu } from '~/components/roadmap/ItemActionsMenu'
import { useSessionDetail } from '~/components/session/SessionDetailContext'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'

type VotingPropertiesManagementProps = {
  votingProperties: VotingProperty[]
  isConnected: boolean
  onCreateVotingProperty: ({ name }: { name: string }) => void
  onUpdateVotingProperty: ({ propertyUuid, name }: { propertyUuid: string; name: string }) => void
  onDeleteVotingProperty: (uuid: string) => void
  onReorderVotingProperties: (propertyOrders: { uuid: string; displayOrder: number }[]) => void
}

type EditingProperty = {
  uuid: string
  name: string
}

type DragData = {
  property: VotingProperty
}

export function VotingPropertiesManagement({
  votingProperties,
  isConnected,
  onCreateVotingProperty,
  onUpdateVotingProperty,
  onDeleteVotingProperty,
  onReorderVotingProperties,
}: VotingPropertiesManagementProps) {
  const { canEdit } = useSessionDetail()
  const canReadVotingProperties = true
  const canCreateVotingProperties = canEdit
  const canUpdateVotingProperties = canEdit
  const canDeleteVotingProperties = canEdit

  const [showCreatePropertyForm, setShowCreatePropertyForm] = useState(false)
  const [newPropertyName, setNewPropertyName] = useState('')
  const [editingProperty, setEditingProperty] = useState<EditingProperty | null>(null)
  const [draggedProperty, setDraggedProperty] = useState<VotingProperty | null>(null)
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null)

  // Sort properties by display order
  const sortedProperties = [...votingProperties].sort((a, b) => a.displayOrder - b.displayOrder)

  const handleCreateProperty = () => {
    if (newPropertyName.trim()) {
      onCreateVotingProperty({
        name: newPropertyName.trim(),
      })
      setNewPropertyName('')
      setShowCreatePropertyForm(false)
    }
  }

  const handleStartEdit = (property: VotingProperty) => {
    setEditingProperty({
      uuid: property.uuid,
      name: property.name,
    })
  }

  const handleSaveEdit = () => {
    if (editingProperty && editingProperty.name.trim()) {
      onUpdateVotingProperty({
        propertyUuid: editingProperty.uuid,
        name: editingProperty.name.trim(),
      })
      setEditingProperty(null)
    }
  }

  const handleCancelEdit = () => {
    setEditingProperty(null)
  }

  const handleReorder = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return

    const reorderedProperties = [...sortedProperties]
    const [movedProperty] = reorderedProperties.splice(fromIndex, 1)
    reorderedProperties.splice(toIndex, 0, movedProperty)

    // Create new display orders
    const propertyOrders = reorderedProperties.map((property, index) => ({
      uuid: property.uuid,
      displayOrder: index,
    }))

    onReorderVotingProperties(propertyOrders)
  }

  // Check if user has any voting property permissions (read or write)
  const hasAnyWritePermission =
    canCreateVotingProperties || canUpdateVotingProperties || canDeleteVotingProperties
  const hasAnyReadPermission = canReadVotingProperties

  // Only show for users with voting property permissions
  if (!hasAnyWritePermission && !hasAnyReadPermission) {
    return null
  }

  // Write-enabled view
  if (hasAnyWritePermission) {
    return (
      <div className="">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Alignment Properties</h2>
          {canCreateVotingProperties && (
            <Button
              onClick={() => setShowCreatePropertyForm(!showCreatePropertyForm)}
              disabled={!isConnected}
              size="sm"
            >
              {showCreatePropertyForm ? 'Cancel' : 'Add Property'}
            </Button>
          )}
        </div>

        {canCreateVotingProperties && showCreatePropertyForm && (
          <div className="mb-4 rounded-md border border-gray-200 bg-gray-50 p-4">
            <div className="space-y-3">
              <div>
                <label htmlFor="property-name" className="block text-sm font-medium text-gray-700">
                  Property Name
                </label>
                <Input
                  id="property-name"
                  type="text"
                  value={newPropertyName}
                  onChange={(e) => setNewPropertyName(e.target.value)}
                  placeholder="e.g., Impact, Effort, Priority"
                  className="mt-1"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleCreateProperty}
                  disabled={!newPropertyName.trim() || !isConnected}
                  size="sm"
                >
                  Create Property
                </Button>
                <Button
                  onClick={() => {
                    setShowCreatePropertyForm(false)
                    setNewPropertyName('')
                  }}
                  variant="outline"
                  size="sm"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {sortedProperties.length > 0 ? (
            <DropZone
              onReorder={handleReorder}
              draggedProperty={draggedProperty}
              setDropTargetIndex={setDropTargetIndex}
            >
              {sortedProperties.map((property, index) => (
                <React.Fragment key={property.uuid}>
                  {dropTargetIndex === index && draggedProperty && (
                    <div className="h-2 rounded bg-blue-200 transition-all duration-200" />
                  )}
                  <PropertyCard
                    property={property}
                    index={index}
                    isEditing={editingProperty?.uuid === property.uuid}
                    editingProperty={editingProperty}
                    setEditingProperty={setEditingProperty}
                    onStartEdit={handleStartEdit}
                    onSaveEdit={handleSaveEdit}
                    onCancelEdit={handleCancelEdit}
                    onDelete={() => onDeleteVotingProperty(property.uuid)}
                    setDraggedProperty={setDraggedProperty}
                    isConnected={isConnected}
                  />
                </React.Fragment>
              ))}
              {dropTargetIndex === sortedProperties.length && draggedProperty && (
                <div className="h-2 rounded bg-blue-200 transition-all duration-200" />
              )}
            </DropZone>
          ) : (
            <div className="py-4 text-center text-gray-500">
              <p>No alignment properties yet. Create your first property above!</p>
              <p className="mt-1 text-sm">
                Properties define what aspects people can vote on for each roadmap item.
              </p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Read-only view for users with read permission
  if (hasAnyReadPermission && sortedProperties.length > 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Voting Properties</h2>
        <div className="space-y-2">
          {sortedProperties.map((property) => (
            <div key={property.uuid} className="rounded-md border border-gray-200 bg-gray-50 p-3">
              <div className="font-medium text-gray-900">{property.name}</div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Voting Properties</h2>
      </div>
      <div className="py-4 text-center text-gray-500">
        <p>No voting properties yet.</p>
        <p className="mt-1 text-sm">Properties define what aspects people can vote on for each roadmap item.</p>
      </div>
    </div>
  )
}

type DropZoneProps = {
  children: React.ReactNode
  onReorder: (fromIndex: number, toIndex: number) => void
  draggedProperty: VotingProperty | null
  setDropTargetIndex: (index: number | null) => void
}

function DropZone({ children, onReorder, draggedProperty, setDropTargetIndex }: DropZoneProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    return dropTargetForElements({
      element,
      onDragEnter: () => {
        // Handle drag enter
      },
      onDragLeave: () => {
        setDropTargetIndex(null)
      },
      onDrag: ({ location }) => {
        if (!draggedProperty) return

        const clientY = location.current.input.clientY
        const rect = element.getBoundingClientRect()
        const relativeY = clientY - rect.top

        // Calculate which position we're hovering over
        const children = Array.from(element.children).filter((child) =>
          child.classList.contains('property-card'),
        ) as HTMLElement[]

        let targetIndex = 0
        for (let i = 0; i < children.length; i++) {
          const childRect = children[i].getBoundingClientRect()
          const childRelativeY = childRect.top - rect.top + childRect.height / 2
          if (relativeY > childRelativeY) {
            targetIndex = i + 1
          } else {
            break
          }
        }

        setDropTargetIndex(targetIndex)
      },
      onDrop: ({ source, location }) => {
        setDropTargetIndex(null)
        const draggedData = source.data as DragData
        const sourceProperty = draggedData.property

        if (!draggedProperty || sourceProperty.uuid !== draggedProperty.uuid) return

        // Find the current index of the dragged property
        const element = ref.current
        if (!element) return

        const children = Array.from(element.children).filter((child) =>
          child.classList.contains('property-card'),
        ) as HTMLElement[]

        const sourceIndex = children.findIndex(
          (child) => child.getAttribute('data-property-uuid') === sourceProperty.uuid,
        )

        if (sourceIndex === -1) return

        const clientY = location.current.input.clientY
        const rect = element.getBoundingClientRect()
        const relativeY = clientY - rect.top

        let targetIndex = 0
        for (let i = 0; i < children.length; i++) {
          const childRect = children[i].getBoundingClientRect()
          const childRelativeY = childRect.top - rect.top + childRect.height / 2
          if (relativeY > childRelativeY) {
            targetIndex = i + 1
          } else {
            break
          }
        }

        // Adjust target index if moving down
        if (targetIndex > sourceIndex) {
          targetIndex -= 1
        }

        onReorder(sourceIndex, targetIndex)
      },
    })
  }, [onReorder, draggedProperty, setDropTargetIndex])

  return (
    <div ref={ref} className="space-y-2">
      {children}
    </div>
  )
}

type PropertyCardProps = {
  property: VotingProperty
  index: number
  isEditing: boolean
  editingProperty: EditingProperty | null
  setEditingProperty: (property: EditingProperty | null) => void
  onStartEdit: (property: VotingProperty) => void
  onSaveEdit: () => void
  onCancelEdit: () => void
  onDelete: () => void
  setDraggedProperty: (property: VotingProperty | null) => void
  isConnected: boolean
}

function PropertyCard({
  property,
  index,
  isEditing,
  editingProperty,
  setEditingProperty,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  setDraggedProperty,
  isConnected,
}: PropertyCardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    return draggable({
      element,
      getInitialData: (): DragData => ({ property }),
      onGenerateDragPreview: () => {
        setIsDragging(true)
        setDraggedProperty(property)
      },
      onDragStart: () => {
        setIsDragging(true)
        setDraggedProperty(property)
      },
      onDrop: () => {
        setIsDragging(false)
        setDraggedProperty(null)
      },
    })
  }, [property, setDraggedProperty])

  return (
    <div
      ref={ref}
      data-property-uuid={property.uuid}
      className={`property-card flex items-start gap-3 rounded-md border border-gray-200 bg-gray-50 p-3 transition-all ${
        isDragging ? 'opacity-50' : 'opacity-100'
      }`}
    >
      <div className="mt-1 cursor-grab text-gray-400 hover:text-gray-600">
        <GripVertical size={16} />
      </div>

      <div className="min-w-0 flex-1">
        {isEditing ? (
          <div className="space-y-2">
            <Input
              value={editingProperty?.name || ''}
              onChange={(e) =>
                setEditingProperty(editingProperty ? { ...editingProperty, name: e.target.value } : null)
              }
              placeholder="Property name"
              className="font-medium"
            />
            <div className="flex gap-2">
              <Button onClick={onSaveEdit} disabled={!editingProperty?.name.trim() || !isConnected} size="sm">
                <Save size={14} className="mr-1" />
                Save
              </Button>
              <Button onClick={onCancelEdit} variant="outline" size="sm">
                <X size={14} className="mr-1" />
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="font-medium text-gray-900">{property.name}</div>
          </>
        )}
      </div>

      {!isEditing && (
        <div className="flex-shrink-0">
          <ItemActionsMenu
            onEdit={() => onStartEdit(property)}
            onDelete={onDelete}
            isConnected={isConnected}
            itemType="property"
            itemUuid={property.uuid}
          />
        </div>
      )}
    </div>
  )
}
