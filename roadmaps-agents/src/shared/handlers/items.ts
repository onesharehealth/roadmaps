import { dataError, type DataResult, dataSuccess } from 'utils/data'
import { zParse } from 'utils/zod'

import { getItemsChannelName, ITEMS_EVENTS } from '../channels'
import { buildAccessContext, canAccessSession, canEditSession, type SessionAgent } from '../session-handlers'
import { assertSessionUnlocked } from '../session-lock-utils'
import { type RoadmapItem, roadmapItemSchema, roadmapItemsSchema, type RoadmapStatus } from '../session-schemas'
import { getRoadmapOrderAtEndOfAssigned } from './timeline'

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

export async function createItem(
  this: SessionAgent,
  {
    title,
    description,
    userId,
    externalId,
    estimate,
    externalContent,
    labels,
  }: {
    title: string
    description?: string | null
    userId: string
    externalId?: string | null
    estimate?: number | null
    externalContent?: string | null
    labels?: { text: string; color: string }[]
  },
) {
  const access = await buildAccessContext(this, userId)
  if (!canEditSession(access)) return dataError('Permission denied')

  const lockError = assertSessionUnlocked(this)
  if (lockError) return lockError

  const uuid = crypto.randomUUID()
  const now = Math.floor(Date.now() / 1000)
  const maxOrder = this.ctx.storage.sql
    .exec(`SELECT COALESCE(MAX(display_order), -1) + 1 as next_order FROM roadmap_items`)
    .one() as { next_order: number }

  const isTimelineSession = this.state.sessionType === 'timeline'
  const roadmapStatus: RoadmapStatus = isTimelineSession ? 'assigned' : 'unaddressed'
  const roadmapOrder = isTimelineSession ? getRoadmapOrderAtEndOfAssigned(this) : null

  const item = this.ctx.storage.sql
    .exec(
      `INSERT INTO roadmap_items (uuid, title, description, external_id, estimate, external_content, created_by, display_order, roadmap_status, roadmap_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`,
      uuid,
      title,
      description ?? null,
      externalId ?? null,
      estimate ?? null,
      externalContent ?? null,
      userId,
      maxOrder?.next_order ?? 0,
      roadmapStatus,
      roadmapOrder,
      now,
      now,
    )
    .one()

  if (!item) return dataError('Failed to create item')

  if (labels?.length) {
    for (const label of labels) {
      this.ctx.storage.sql.exec(
        `INSERT INTO item_labels (item_uuid, text, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`,
        uuid,
        label.text,
        label.color,
        now,
        now,
      )
    }
  }

  const parsed = zParse(roadmapItemSchema, mapItemRow(this, item as Record<string, unknown>))
  if (!parsed.ok) return parsed

  this.broadcastToChannel(getItemsChannelName(this.state.uuid), ITEMS_EVENTS.CREATED, { item: parsed.body })
  return parsed
}

export async function updateItem(
  this: SessionAgent,
  {
    itemUuid,
    title,
    description,
    externalId,
    estimate,
    externalContent,
    durationWeeks,
    labels,
    userId,
  }: {
    itemUuid: string
    title: string
    description?: string | null
    externalId?: string | null
    estimate?: number | null
    externalContent?: string | null
    durationWeeks?: number
    labels?: { text: string; color: string }[]
    userId: string
  },
) {
  const access = await buildAccessContext(this, userId)
  if (!canEditSession(access)) return dataError('Permission denied')

  const lockError = assertSessionUnlocked(this)
  if (lockError) return lockError

  const existingItem = this.ctx.storage.sql.exec(`SELECT * FROM roadmap_items WHERE uuid = ?`, itemUuid).one()
  if (!existingItem) return dataError('Item not found')

  const updates = ['title = ?', 'updated_at = UNIXEPOCH()']
  const params: (string | number | null)[] = [title]

  if (description !== undefined) {
    updates.push('description = ?')
    params.push(description ?? null)
  }
  if (externalId !== undefined) {
    updates.push('external_id = ?')
    params.push(externalId ?? null)
  }
  if (estimate !== undefined) {
    updates.push('estimate = ?')
    params.push(estimate ?? null)
  }
  if (externalContent !== undefined) {
    updates.push('external_content = ?')
    params.push(externalContent ?? null)
  }
  if (durationWeeks !== undefined) {
    updates.push('duration_weeks = ?')
    params.push(durationWeeks)
  }

  params.push(itemUuid)

  const item = this.ctx.storage.sql
    .exec(`UPDATE roadmap_items SET ${updates.join(', ')} WHERE uuid = ? RETURNING *`, ...params)
    .one()

  if (!item) return dataError('Failed to update item')

  if (labels) {
    const now = Math.floor(Date.now() / 1000)
    this.ctx.storage.sql.exec(`DELETE FROM item_labels WHERE item_uuid = ?`, itemUuid)
    for (const label of labels) {
      this.ctx.storage.sql.exec(
        `INSERT INTO item_labels (item_uuid, text, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`,
        itemUuid,
        label.text,
        label.color,
        now,
        now,
      )
    }
  }

  const parsed = zParse(roadmapItemSchema, mapItemRow(this, item as Record<string, unknown>))
  if (!parsed.ok) return parsed

  this.broadcastToChannel(getItemsChannelName(this.state.uuid), ITEMS_EVENTS.UPDATED, { item: parsed.body })
  return parsed
}

export async function deleteItem(
  this: SessionAgent,
  { itemUuid, userId }: { itemUuid: string; userId: string },
): Promise<DataResult<{ deleted: boolean }>> {
  const access = await buildAccessContext(this, userId)
  if (!canEditSession(access)) return dataError('Permission denied')

  const lockError = assertSessionUnlocked(this)
  if (lockError) return lockError

  const { sessionType, uuid } = this.state

  if (sessionType === 'dot_voting') {
    this.ctx.storage.sql.exec(`DELETE FROM dot_votes WHERE item_uuid = ?`, itemUuid)
  }

  if (sessionType === 'property_voting') {
    this.ctx.storage.sql.exec(`DELETE FROM property_votes WHERE item_uuid = ?`, itemUuid)
  }

  this.ctx.storage.sql.exec(`DELETE FROM item_labels WHERE item_uuid = ?`, itemUuid)
  this.ctx.storage.sql.exec(`DELETE FROM roadmap_items WHERE uuid = ?`, itemUuid)

  this.broadcastToChannel(getItemsChannelName(uuid), ITEMS_EVENTS.DELETED, {
    itemUuid,
  })
  return dataSuccess({ deleted: true })
}

export async function getItem(this: SessionAgent, { itemUuid, userId }: { itemUuid: string; userId: string }) {
  const access = await buildAccessContext(this, userId)
  if (!canAccessSession(access)) return dataError('Permission denied')

  const item = this.ctx.storage.sql.exec(`SELECT * FROM roadmap_items WHERE uuid = ?`, itemUuid).one()
  if (!item) return dataError('Item not found')
  return zParse(roadmapItemSchema, mapItemRow(this, item as Record<string, unknown>))
}

export async function getAllItems(this: SessionAgent, { orderBy, userId }: { orderBy?: string; userId: string }) {
  const access = await buildAccessContext(this, userId)
  if (!canAccessSession(access)) return dataError('Permission denied')

  let query = 'SELECT * FROM roadmap_items'
  query += orderBy ? ` ORDER BY ${orderBy}` : ' ORDER BY display_order ASC'

  const items = this.ctx.storage.sql.exec(query).toArray()
  const transformed = items.map((item) => mapItemRow(this, item as Record<string, unknown>))
  return zParse(roadmapItemsSchema, transformed)
}

export async function reorderItems(
  this: SessionAgent,
  {
    itemOrders,
    userId,
  }: {
    itemOrders: { uuid: string; displayOrder: number }[]
    userId: string
  },
) {
  const access = await buildAccessContext(this, userId)
  if (!canEditSession(access)) return dataError('Permission denied')

  const lockError = assertSessionUnlocked(this)
  if (lockError) return lockError

  for (const { uuid, displayOrder } of itemOrders) {
    this.ctx.storage.sql.exec(
      `UPDATE roadmap_items SET display_order = ?, updated_at = UNIXEPOCH() WHERE uuid = ?`,
      displayOrder,
      uuid,
    )
  }

  const allItemsResult = await getAllItems.call(this, { userId })
  if (!allItemsResult.ok) return allItemsResult

  this.broadcastToChannel(getItemsChannelName(this.state.uuid), ITEMS_EVENTS.REORDERED, {
    items: allItemsResult.body,
  })
  return allItemsResult
}
