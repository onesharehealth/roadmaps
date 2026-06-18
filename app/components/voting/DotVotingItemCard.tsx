import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import type { RoadmapItem } from 'roadmaps-agents/schemas'
import type { DotVote, DotVoteStats } from 'roadmaps-agents/schemas'
import { darkenHexColor } from 'utils/color'

import { EstimateSelect } from '~/components/items/EstimateSelect'
import { ItemFormFields } from '~/components/items/ItemFormFields'
import { Estimate } from '~/components/roadmap/Estimate'
import { FloatingTooltip } from '~/components/roadmap/FloatingTooltip'
import { ItemActionsMenu } from '~/components/roadmap/ItemActionsMenu'
import { Tag } from '~/components/roadmap/Tag'
import { Button } from '~/components/ui/button'
import { Dialog, DialogContent } from '~/components/ui/dialog'
import { MarkdownContent } from '~/components/ui/markdown-content'

const DEFAULT_DOT_COLOR = '#ff0f87'
const DEFAULT_BORDER_COLOR = '#e5e7eb'

function getVoteKey(vote: DotVote) {
  return `${vote.username}-${vote.dotPositionX}-${vote.dotPositionY}`
}

type DotVotingItemCardProps = {
  item: RoadmapItem
  dotStats?: DotVoteStats
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

type DotVotingAreaProps = {
  item: RoadmapItem
  dots: Array<{ x: number; y: number; id: string }>
  dotStats?: DotVoteStats
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
  disabled?: boolean
}

function DotVotingArea({
  item,
  dots,
  dotStats,
  onCastDotVote,
  onRemoveDotVote,
  isConnected,
  hasRemainingVotes,
  userEmail,
  disabled,
}: DotVotingAreaProps) {
  const dotColor = DEFAULT_DOT_COLOR
  const strokeColor = darkenHexColor(DEFAULT_BORDER_COLOR, 20)
  const svgRef = useRef<SVGSVGElement>(null)

  function handleAreaClick(e: React.MouseEvent<SVGSVGElement>) {
    if (!isConnected || disabled || !svgRef.current) return

    const target = e.target as SVGElement
    if (target.tagName === 'circle') return
    if (!hasRemainingVotes) return

    const svg = svgRef.current
    const pt = new DOMPoint(e.clientX, e.clientY)
    const screenCTM = svg.getScreenCTM()
    if (!screenCTM) return

    const svgPt = pt.matrixTransform(screenCTM.inverse())
    onCastDotVote({
      itemUuid: item.uuid,
      dotPositionX: svgPt.x,
      dotPositionY: svgPt.y,
    })
  }

  function handleDotClick(
    e: React.MouseEvent,
    dot: { x: number; y: number; id: string },
  ) {
    e.stopPropagation()
    if (!isConnected || disabled) return
    onRemoveDotVote({
      itemUuid: item.uuid,
      dotPositionX: dot.x,
      dotPositionY: dot.y,
    })
  }

  function handleAreaKeyDown(e: React.KeyboardEvent<SVGSVGElement>) {
    if (e.key !== 'Enter' && e.key !== ' ') return
    e.preventDefault()
    if (!isConnected || disabled || !hasRemainingVotes || !svgRef.current)
      return

    const svg = svgRef.current
    const bbox = svg.getBoundingClientRect()
    const pt = new DOMPoint(
      bbox.left + bbox.width / 2,
      bbox.top + bbox.height / 2,
    )
    const screenCTM = svg.getScreenCTM()
    if (!screenCTM) return

    const svgPt = pt.matrixTransform(screenCTM.inverse())
    onCastDotVote({
      itemUuid: item.uuid,
      dotPositionX: svgPt.x,
      dotPositionY: svgPt.y,
    })
  }

  return (
    <FloatingTooltip
      content="You're out of dots! Remove one of your dots to place it here."
      enabled={!hasRemainingVotes && !disabled}
      placement="bottom"
      maxWidth={200}
    >
      <div className="flex justify-center">
        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          viewBox="0 0 200 80"
          style={{ maxWidth: '100%' }}
          role="button"
          tabIndex={disabled || !hasRemainingVotes ? -1 : 0}
          aria-label="Place a dot vote"
          className={
            disabled
              ? 'cursor-not-allowed opacity-50'
              : hasRemainingVotes
              ? 'cursor-pointer'
              : 'cursor-not-allowed'
          }
          onClick={handleAreaClick}
          onKeyDown={handleAreaKeyDown}
        >
          <rect
            x="4"
            y="4"
            width="192"
            height="72"
            fill="none"
            stroke={strokeColor}
            strokeWidth="1"
            strokeDasharray="3,3"
            rx="6"
          />

          {dotStats &&
            dotStats.votes
              .filter(
                (vote: DotVote) =>
                  !dots.some(
                    (d) =>
                      d.x === vote.dotPositionX && d.y === vote.dotPositionY,
                  ),
              )
              .map((vote: DotVote) => (
                <FloatingTooltip
                  key={getVoteKey(vote)}
                  content={`👤 ${vote.username}'s dot`}
                  placement="top"
                  maxWidth="max-content"
                >
                  <circle
                    cx={vote.dotPositionX}
                    cy={vote.dotPositionY}
                    r="8"
                    fill={dotColor}
                    className="opacity-30"
                  />
                </FloatingTooltip>
              ))}

          {dots.map((dot) => (
            <FloatingTooltip
              key={dot.id}
              content="Your dot... click to remove"
              maxWidth="max-content"
            >
              <circle
                cx={dot.x}
                cy={dot.y}
                r="8"
                fill={dotColor}
                className="cursor-pointer opacity-80 transition-opacity hover:opacity-100"
                onClick={(e) => handleDotClick(e, dot)}
                data-dot-id={dot.id}
              />
            </FloatingTooltip>
          ))}
        </svg>
      </div>
    </FloatingTooltip>
  )
}

type VoteCounterProps = {
  dots: Array<{ x: number; y: number; id: string }>
  dotStats?: DotVoteStats
  dotColor?: string
}

function VoteCounter({
  dots,
  dotStats,
  dotColor = DEFAULT_DOT_COLOR,
}: VoteCounterProps) {
  return (
    <div className="border-t border-gray-100 px-4 py-2">
      <div className="flex items-center gap-2 text-xs text-gray-600">
        <span className="font-medium">Your votes: {dots.length}</span>
        {dotStats && dotStats.totalVotes > 0 ? (
          <span className="ml-auto text-gray-500">
            Total: {dotStats.totalVotes}
          </span>
        ) : (
          <span className="ml-auto text-gray-400">No votes yet</span>
        )}
      </div>
      <div className="mt-1 flex h-4 flex-row-reverse flex-wrap items-center justify-start gap-1">
        {dots.length > 0 &&
          dots.map((dot, idx) => (
            <div
              key={dot.id || idx}
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: dotColor, opacity: 0.8 }}
              title="Your dot (click to remove)"
            />
          ))}
        {dotStats &&
          dotStats.votes.length > 0 &&
          dotStats.votes
            .filter(
              (vote: DotVote) =>
                !dots.some(
                  (d) => d.x === vote.dotPositionX && d.y === vote.dotPositionY,
                ),
            )
            .map((vote: DotVote) => (
              <div
                key={getVoteKey(vote)}
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: dotColor, opacity: 0.3 }}
                title={`${vote.username}'s dot`}
              />
            ))}
      </div>
    </div>
  )
}

export function DotVotingItemCard({
  item,
  dotStats,
  onCastDotVote,
  onRemoveDotVote,
  isConnected,
  hasRemainingVotes,
  userEmail,
  canEdit = false,
  onUpdateItem,
  onDeleteItem,
}: DotVotingItemCardProps) {
  const [dots, setDots] = useState<Array<{ x: number; y: number; id: string }>>(
    [],
  )
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(item.title)
  const [editDescription, setEditDescription] = useState(item.description || '')
  const [editEstimate, setEditEstimate] = useState<number | null>(item.estimate)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (dotStats?.votes) {
      const userVotes = dotStats.votes.filter((v) => v.username === userEmail)
      if (userVotes.length > 0) {
        setDots(
          userVotes.map((vote: DotVote, idx: number) => ({
            x: vote.dotPositionX,
            y: vote.dotPositionY,
            id: `${vote.id || idx}`,
          })),
        )
      } else {
        setDots([])
      }
    }
  }, [dotStats, userEmail])

  function handleSaveEdit() {
    if (!editTitle.trim() || !onUpdateItem) return
    onUpdateItem({
      itemUuid: item.uuid,
      title: editTitle.trim(),
      description: editDescription.trim() || undefined,
      estimate: editEstimate,
    })
    setIsEditing(false)
  }

  function handleStartEdit() {
    setEditTitle(item.title)
    setEditDescription(item.description || '')
    setEditEstimate(item.estimate)
    setIsEditing(true)
  }

  return (
    <div
      className="flex h-full flex-col rounded-lg border border-gray-200 border-l-4 border-l-slate-300 bg-white shadow-sm transition-shadow hover:shadow-md"
      ref={containerRef}
    >
      <div className="flex flex-1 flex-col p-4">
        <div className="mb-2 flex items-start justify-between gap-2">
          {isEditing ? (
            <div className="flex-1 space-y-2">
              <ItemFormFields
                title={editTitle}
                description={editDescription}
                onTitleChange={setEditTitle}
                onDescriptionChange={setEditDescription}
              />
              <EstimateSelect
                value={editEstimate}
                onChange={setEditEstimate}
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
            <button
              onClick={() => setIsDialogOpen(true)}
              className="flex-1 text-left"
            >
              <h4 className="cursor-pointer font-semibold text-blue-600 hover:underline">
                {item.title}
              </h4>
            </button>
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

        {!isEditing && item.description && (
          <p
            className="line-clamp-4 text-sm text-gray-600"
            title={item.description}
          >
            {item.description}
          </p>
        )}
        {!isEditing && (
          <div className="mt-2 flex flex-wrap gap-2">
            <Estimate estimate={item.estimate} />
            {item.labels?.map((label) => (
              <Tag
                key={label.id}
                text={label.text}
                color={label.color}
              />
            ))}
          </div>
        )}
      </div>

      <div className="mt-auto px-4 pb-2">
        <DotVotingArea
          item={item}
          dots={dots}
          dotStats={dotStats}
          onCastDotVote={onCastDotVote}
          onRemoveDotVote={onRemoveDotVote}
          isConnected={isConnected}
          hasRemainingVotes={hasRemainingVotes}
          userEmail={userEmail}
          disabled={isEditing}
        />
      </div>

      <VoteCounter
        dots={dots}
        dotStats={dotStats}
        dotColor={DEFAULT_DOT_COLOR}
      />

      <Dialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
      >
        <DialogContent
          showCloseButton={false}
          className="max-h-[90vh] max-w-2xl gap-0 overflow-y-auto p-0 sm:max-w-2xl"
        >
          <div className="sticky top-0 z-10 flex items-start justify-between border-b border-gray-200 bg-white p-6">
            <h2 className="text-2xl font-bold text-gray-900">{item.title}</h2>
            <button
              onClick={() => setIsDialogOpen(false)}
              className="text-gray-400 hover:text-gray-600"
              aria-label="Close dialog"
            >
              <X size={24} />
            </button>
          </div>

          <div className="p-6">
            {item.description && (
              <div className="mb-4 border-b border-gray-200 pb-4">
                <h3 className="mb-2 text-sm font-semibold text-gray-700">
                  Description
                </h3>
                <p className="whitespace-pre-wrap text-gray-700">
                  {item.description}
                </p>
              </div>
            )}

            <div className="mb-4 flex items-center gap-2 border-b border-gray-200 pb-4">
              <Estimate estimate={item.estimate} />
              {item.labels?.map((label) => (
                <Tag
                  key={label.id}
                  text={label.text}
                  color={label.color}
                />
              ))}
            </div>

            <div className="mb-4 border-b border-gray-200 pb-4">
              <h3 className="mb-3 text-sm font-semibold text-gray-700">
                Voting
              </h3>
              <div className="mx-auto mb-3 max-w-[350px]">
                <DotVotingArea
                  item={item}
                  dots={dots}
                  dotStats={dotStats}
                  onCastDotVote={onCastDotVote}
                  onRemoveDotVote={onRemoveDotVote}
                  isConnected={isConnected}
                  hasRemainingVotes={hasRemainingVotes}
                  userEmail={userEmail}
                />
              </div>
              <VoteCounter
                dots={dots}
                dotStats={dotStats}
                dotColor={DEFAULT_DOT_COLOR}
              />
            </div>

            {item.externalContent && (
              <div>
                <h3 className="mb-3 text-sm font-semibold text-gray-700">
                  Details
                </h3>
                <MarkdownContent className="rounded-md bg-gray-50 p-4">
                  {item.externalContent}
                </MarkdownContent>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
