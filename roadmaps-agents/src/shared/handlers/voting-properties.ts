import { dataError, dataSuccess } from 'utils/data'
import { zParse } from 'utils/zod'

import { getVotingPropertiesChannelName, VOTING_PROPERTIES_EVENTS } from '../channels'
import { buildAccessContext, canEditSession, type SessionAgent } from '../session-handlers'
import { votingPropertiesSchema, type VotingProperty, votingPropertySchema } from '../session-schemas'

function mapPropertyRow(property: Record<string, unknown>) {
  return {
    uuid: property.uuid as string,
    name: property.name as string,
    displayOrder: property.display_order as number,
    createdAt: property.created_at as number,
    updatedAt: property.updated_at as number,
  }
}

export async function createVotingProperty(
  this: SessionAgent,
  { name, userId }: { name: string; userId: string },
) {
  const access = await buildAccessContext(this, userId)
  if (!canEditSession(access)) return dataError('Permission denied')

  const uuid = crypto.randomUUID()
  const now = Math.floor(Date.now() / 1000)
  const maxOrder = this.ctx.storage.sql
    .exec(`SELECT COALESCE(MAX(display_order), -1) + 1 as n FROM voting_properties`)
    .one() as { n: number }

  const property = this.ctx.storage.sql
    .exec(
      `INSERT INTO voting_properties (uuid, name, display_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?) RETURNING *`,
      uuid,
      name,
      maxOrder?.n ?? 0,
      now,
      now,
    )
    .one()

  if (!property) return dataError('Failed to create voting property')
  return zParse(votingPropertySchema, mapPropertyRow(property as Record<string, unknown>))
}

export async function updateVotingProperty(
  this: SessionAgent,
  { propertyUuid, name, userId }: { propertyUuid: string; name: string; userId: string },
) {
  const access = await buildAccessContext(this, userId)
  if (!canEditSession(access)) return dataError('Permission denied')

  const existingProperty = this.ctx.storage.sql
    .exec(`SELECT * FROM voting_properties WHERE uuid = ?`, propertyUuid)
    .one()
  if (!existingProperty) return dataError('Voting property not found')

  const property = this.ctx.storage.sql
    .exec(
      `UPDATE voting_properties SET name = ?, updated_at = UNIXEPOCH() WHERE uuid = ? RETURNING *`,
      name,
      propertyUuid,
    )
    .one()

  if (!property) return dataError('Failed to update voting property')

  const parsed = zParse(votingPropertySchema, mapPropertyRow(property as Record<string, unknown>))
  if (!parsed.ok) return parsed

  this.broadcastToChannel(
    getVotingPropertiesChannelName(this.state.uuid),
    VOTING_PROPERTIES_EVENTS.UPDATED,
    parsed.body,
  )
  return parsed
}

export async function deleteVotingProperty(
  this: SessionAgent,
  { propertyUuid, userId }: { propertyUuid: string; userId: string },
) {
  const access = await buildAccessContext(this, userId)
  if (!canEditSession(access)) return dataError('Permission denied')

  this.ctx.storage.sql.exec(`DELETE FROM voting_properties WHERE uuid = ?`, propertyUuid)
  this.ctx.storage.sql.exec(`DELETE FROM property_votes WHERE property_uuid = ?`, propertyUuid)

  this.broadcastToChannel(getVotingPropertiesChannelName(this.state.uuid), VOTING_PROPERTIES_EVENTS.DELETED, {
    propertyUuid,
  })
  return dataSuccess({ deleted: true })
}

export async function getVotingProperty(this: SessionAgent, { propertyUuid }: { propertyUuid: string }) {
  const property = this.ctx.storage.sql.exec(`SELECT * FROM voting_properties WHERE uuid = ?`, propertyUuid).one()
  if (!property) return dataError('Voting property not found')
  return zParse(votingPropertySchema, mapPropertyRow(property as Record<string, unknown>))
}

export async function getAllVotingProperties(this: SessionAgent, { orderBy }: { orderBy?: string } = {}) {
  let query = 'SELECT * FROM voting_properties'
  query += orderBy ? ` ORDER BY ${orderBy}` : ' ORDER BY display_order ASC'

  const properties = this.ctx.storage.sql.exec(query).toArray()
  const transformed = properties.map((property) => mapPropertyRow(property as Record<string, unknown>))
  return zParse(votingPropertiesSchema, transformed)
}

export async function reorderVotingProperties(
  this: SessionAgent,
  {
    propertyOrders,
    userId,
  }: {
    propertyOrders: { uuid: string; displayOrder: number }[]
    userId: string
  },
) {
  const access = await buildAccessContext(this, userId)
  if (!canEditSession(access)) return dataError('Permission denied')

  for (const { uuid, displayOrder } of propertyOrders) {
    this.ctx.storage.sql.exec(
      `UPDATE voting_properties SET display_order = ?, updated_at = UNIXEPOCH() WHERE uuid = ?`,
      displayOrder,
      uuid,
    )
  }

  const result = await getAllVotingProperties.call(this)
  if (!result.ok) return result

  this.broadcastToChannel(
    getVotingPropertiesChannelName(this.state.uuid),
    VOTING_PROPERTIES_EVENTS.REORDERED,
    result.body,
  )
  return result
}
