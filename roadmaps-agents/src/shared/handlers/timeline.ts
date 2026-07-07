import { dataError, type DataResult, dataSuccess } from 'utils/data'
import { zParse } from 'utils/zod'

import { getTimelineChannelName, ROADMAP_TIMELINE_EVENTS } from '../channels'
import { buildAccessContext, canAccessSession, canEditSession, type SessionAgent } from '../session-handlers'
import { assertSessionUnlocked } from '../session-lock-utils'
import { type RoadmapItem, roadmapItemSchema, roadmapItemsSchema, type RoadmapStatus } from '../session-schemas'

function loadLabelsForItem(agent: SessionAgent, itemUuid: string) {
  const labels = agent.ctx.storage.sql
    .exec(`SELECT * FROM item_labels WHERE item_uuid = ? ORDER BY created_at ASC`, itemUuid)
    .toArray()

  return labels.map((label) => ({
    id: label.id as number,
    itemUuid: label.item_uuid as string,
    text: label.text as string,
    color: label.color as string,
    createdAt: label.created_at as number,
    updatedAt: label.updated_at as number,
  }))
}

export function getRoadmapOrderAtEndOfAssigned(agent: SessionAgent) {
  const allItems = agent.ctx.storage.sql.exec(`SELECT roadmap_status FROM roadmap_items`).toArray()

  let unaddressedCount = 0
  let assignedCount = 0

  for (const item of allItems) {
    const status = item.roadmap_status as RoadmapStatus
    if (status === 'unaddressed') unaddressedCount++
    else if (status === 'assigned') assignedCount++
  }

  return unaddressedCount + assignedCount
}

function mapItemRow(agent: SessionAgent, item: Record<string, unknown>) {
  const uuid = item.uuid as string
  return {
    uuid,
    title: item.title as string,
    description: item.description as string | null,
    displayOrder: item.display_order as number,
    roadmapStatus: (item.roadmap_status as RoadmapItem['roadmapStatus']) ?? 'unaddressed',
    roadmapOrder: item.roadmap_order as number | null,
    durationWeeks: item.duration_weeks as number | null,
    externalId: item.external_id as string | null,
    estimate: item.estimate as number | null,
    externalContent: item.external_content as string | null,
    labels: loadLabelsForItem(agent, uuid),
    createdBy: item.created_by as string,
    createdAt: item.created_at as number,
    updatedAt: item.updated_at as number,
  }
}

export async function setRoadmapStatus(
  this: SessionAgent,
  { itemUuid, status, userId }: { itemUuid: string; status: RoadmapStatus; userId: string },
): Promise<DataResult<{ updated: boolean }>> {
  const access = await buildAccessContext(this, userId)
  if (!canEditSession(access)) return dataError('Permission denied')

  const lockError = assertSessionUnlocked(this)
  if (lockError) return lockError

  const allItems = this.ctx.storage.sql.exec(`SELECT * FROM roadmap_items`).toArray()

  type DbItem = {
    uuid: string
    roadmap_status: string
    roadmap_order: number | null
  }
  const itemsByStatus: Record<RoadmapStatus, DbItem[]> = {
    unaddressed: [],
    assigned: [],
    completed: [],
  }

  for (const item of allItems) {
    if (item.uuid !== itemUuid) {
      itemsByStatus[item.roadmap_status as RoadmapStatus].push(item as DbItem)
    }
  }

  for (const statusGroup of Object.values(itemsByStatus)) {
    statusGroup.sort((a, b) => (a.roadmap_order ?? 0) - (b.roadmap_order ?? 0))
  }

  let currentOrder = 0
  const orderUpdates: { uuid: string; roadmapOrder: number }[] = []

  for (const item of itemsByStatus.unaddressed) {
    orderUpdates.push({ uuid: item.uuid, roadmapOrder: currentOrder++ })
  }
  if (status === 'unaddressed') orderUpdates.push({ uuid: itemUuid, roadmapOrder: currentOrder++ })

  for (const item of itemsByStatus.assigned) {
    orderUpdates.push({ uuid: item.uuid, roadmapOrder: currentOrder++ })
  }
  if (status === 'assigned') orderUpdates.push({ uuid: itemUuid, roadmapOrder: currentOrder++ })

  for (const item of itemsByStatus.completed) {
    orderUpdates.push({ uuid: item.uuid, roadmapOrder: currentOrder++ })
  }
  if (status === 'completed') orderUpdates.push({ uuid: itemUuid, roadmapOrder: currentOrder++ })

  const movedItemUpdate = orderUpdates.find((u) => u.uuid === itemUuid)
  if (!movedItemUpdate) return dataError('Failed to calculate order for moved item')

  const updatedItem = this.ctx.storage.sql
    .exec(
      `UPDATE roadmap_items SET roadmap_status = ?, roadmap_order = ?, updated_at = UNIXEPOCH() WHERE uuid = ? RETURNING *`,
      status,
      movedItemUpdate.roadmapOrder,
      itemUuid,
    )
    .one()

  if (!updatedItem) return dataError('Failed to update item roadmap status')

  for (const { uuid, roadmapOrder } of orderUpdates) {
    if (uuid !== itemUuid) {
      this.ctx.storage.sql.exec(
        `UPDATE roadmap_items SET roadmap_order = ?, updated_at = UNIXEPOCH() WHERE uuid = ?`,
        roadmapOrder,
        uuid,
      )
    }
  }

  const parsed = zParse(roadmapItemSchema, mapItemRow(this, updatedItem as Record<string, unknown>))
  if (!parsed.ok) return parsed

  this.broadcastToChannel(getTimelineChannelName(this.state.uuid), ROADMAP_TIMELINE_EVENTS.STATUS_UPDATED, {
    item: parsed.body,
    status,
  })

  return dataSuccess({ updated: true })
}

export async function reorderTimelineItems(
  this: SessionAgent,
  { itemOrders, userId }: { itemOrders: { uuid: string; roadmapOrder: number }[]; userId: string },
) {
  const access = await buildAccessContext(this, userId)
  if (!canEditSession(access)) return dataError('Permission denied')

  const lockError = assertSessionUnlocked(this)
  if (lockError) return lockError

  for (const { uuid, roadmapOrder } of itemOrders) {
    this.ctx.storage.sql.exec(
      `UPDATE roadmap_items SET roadmap_order = ?, updated_at = UNIXEPOCH() WHERE uuid = ?`,
      roadmapOrder,
      uuid,
    )
  }

  const itemsByStatusResult = await getAllItemsByStatus.call(this, { userId })
  if (!itemsByStatusResult.ok) return itemsByStatusResult

  this.broadcastToChannel(getTimelineChannelName(this.state.uuid), ROADMAP_TIMELINE_EVENTS.TIMELINE_ITEMS, {
    itemsByStatus: itemsByStatusResult.body,
  })

  return dataSuccess(itemsByStatusResult.body.assigned)
}

export async function getItemsByStatus(this: SessionAgent, { status }: { status: RoadmapStatus }) {
  const items = this.ctx.storage.sql
    .exec(`SELECT * FROM roadmap_items WHERE roadmap_status = ? ORDER BY roadmap_order ASC`, status)
    .toArray()

  const transformed = items.map((item) => mapItemRow(this, item as Record<string, unknown>))
  return zParse(roadmapItemsSchema, transformed)
}

export async function getAllItemsByStatus(this: SessionAgent, { userId }: { userId: string }) {
  const access = await buildAccessContext(this, userId)
  if (!canAccessSession(access)) return dataError('Permission denied')

  const items = this.ctx.storage.sql.exec(`SELECT * FROM roadmap_items`).toArray()
  const transformed = items.map((item) => mapItemRow(this, item as Record<string, unknown>))

  const parsedResult = zParse(roadmapItemsSchema, transformed)
  if (!parsedResult.ok) return parsedResult

  const itemsByStatus: Record<RoadmapStatus, RoadmapItem[]> = {
    unaddressed: [],
    assigned: [],
    completed: [],
  }

  for (const item of parsedResult.body) {
    itemsByStatus[item.roadmapStatus ?? 'unaddressed'].push(item)
  }

  itemsByStatus.unaddressed.sort((a, b) => (a.roadmapOrder ?? 0) - (b.roadmapOrder ?? 0))
  itemsByStatus.assigned.sort((a, b) => (a.roadmapOrder ?? 0) - (b.roadmapOrder ?? 0))
  itemsByStatus.completed.sort((a, b) => (a.roadmapOrder ?? 0) - (b.roadmapOrder ?? 0))

  return dataSuccess(itemsByStatus)
}
