import { dataError, dataSuccess } from 'utils/data'
import { zParse } from 'utils/zod'

import { getPropertyVotesChannelName, PROPERTY_VOTES_EVENTS } from '../channels'
import { buildAccessContext, canAccessSession, canVote, type SessionAgent } from '../session-handlers'
import { assertSessionUnlocked } from '../session-lock-utils'
import {
  type CompletePropertyStats,
  completePropertyStatsSchema,
  propertyVoteSchema,
  propertyVotesSchema,
  type PropertyVoteStats,
  propertyVoteStatsSchema,
} from '../session-schemas'

export async function castPropertyVote(
  this: SessionAgent,
  {
    propertyUuid,
    itemUuid,
    userId,
    value,
  }: {
    propertyUuid: string
    itemUuid: string
    userId: string
    value: number
  },
) {
  const access = await buildAccessContext(this, userId)
  if (!canVote(access)) return dataError('Permission denied')

  const lockError = assertSessionUnlocked(this)
  if (lockError) return lockError

  const propertyExists = this.ctx.storage.sql
    .exec(`SELECT 1 FROM voting_properties WHERE uuid = ?`, propertyUuid)
    .one()
  const itemExists = this.ctx.storage.sql.exec(`SELECT 1 FROM roadmap_items WHERE uuid = ?`, itemUuid).one()

  if (!propertyExists) return dataError('Voting property not found')
  if (!itemExists) return dataError('Item not found')

  const vote = this.ctx.storage.sql
    .exec(
      `INSERT OR REPLACE INTO property_votes (property_uuid, item_uuid, username, value, created_at, updated_at)
       VALUES (?, ?, ?, ?,
         COALESCE((SELECT created_at FROM property_votes WHERE property_uuid = ? AND item_uuid = ? AND username = ?), UNIXEPOCH()),
         UNIXEPOCH())
       RETURNING *`,
      propertyUuid,
      itemUuid,
      userId,
      value,
      propertyUuid,
      itemUuid,
      userId,
    )
    .one()

  if (!vote) return dataError('Failed to cast vote')

  const parsed = zParse(propertyVoteSchema, {
    propertyUuid: vote.property_uuid,
    itemUuid: vote.item_uuid,
    username: vote.username,
    value: vote.value,
    createdAt: vote.created_at,
    updatedAt: vote.updated_at,
  })

  if (!parsed.ok) return parsed

  const channelName = getPropertyVotesChannelName(this.state.uuid)
  this.broadcastToChannel(channelName, PROPERTY_VOTES_EVENTS.CAST_CONFIRMED, parsed.body)

  const statsResult = await getPropertyVoteStats.call(this, { propertyUuid, itemUuid, userId })
  if (statsResult.ok) {
    this.broadcastToChannel(channelName, PROPERTY_VOTES_EVENTS.STATS, { stats: statsResult.body })
  }

  return parsed
}

export async function getPropertyVoteStats(
  this: SessionAgent,
  {
    propertyUuid,
    itemUuid,
    userId,
  }: {
    propertyUuid: string
    itemUuid: string
    userId: string
  },
) {
  const access = await buildAccessContext(this, userId)
  if (!canAccessSession(access)) return dataError('Permission denied')

  const votes = this.ctx.storage.sql
    .exec(
      `SELECT * FROM property_votes WHERE property_uuid = ? AND item_uuid = ? ORDER BY created_at DESC`,
      propertyUuid,
      itemUuid,
    )
    .toArray()

  const transformedVotes = votes.map((vote) => ({
    propertyUuid: vote.property_uuid,
    itemUuid: vote.item_uuid,
    username: vote.username,
    value: vote.value,
    createdAt: vote.created_at,
    updatedAt: vote.updated_at,
  }))

  const parsedVotes = zParse(propertyVotesSchema, transformedVotes)
  if (!parsedVotes.ok) return parsedVotes

  const values = parsedVotes.body.map((v) => v.value)
  const average = values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0
  const min = values.length > 0 ? Math.min(...values) : 0
  const max = values.length > 0 ? Math.max(...values) : 0
  const userVote = userId ? (parsedVotes.body.find((v) => v.username === userId) ?? null) : null

  const stats: PropertyVoteStats = {
    propertyUuid,
    itemUuid,
    votes: parsedVotes.body,
    average,
    min,
    max,
    totalVotes: parsedVotes.body.length,
    userVote,
  }

  return zParse(propertyVoteStatsSchema, stats)
}

export async function removePropertyVote(
  this: SessionAgent,
  {
    propertyUuid,
    itemUuid,
    userId,
  }: {
    propertyUuid: string
    itemUuid: string
    userId: string
  },
) {
  const access = await buildAccessContext(this, userId)
  if (!canVote(access)) return dataError('Permission denied')

  const lockError = assertSessionUnlocked(this)
  if (lockError) return lockError

  this.ctx.storage.sql.exec(
    `DELETE FROM property_votes WHERE property_uuid = ? AND item_uuid = ? AND username = ?`,
    propertyUuid,
    itemUuid,
    userId,
  )

  const channelName = getPropertyVotesChannelName(this.state.uuid)
  this.broadcastToChannel(channelName, PROPERTY_VOTES_EVENTS.REMOVE_CONFIRMED, {
    propertyUuid,
    itemUuid,
    username: userId,
  })

  const statsResult = await getPropertyVoteStats.call(this, { propertyUuid, itemUuid, userId })
  if (statsResult.ok) {
    this.broadcastToChannel(channelName, PROPERTY_VOTES_EVENTS.STATS, { stats: statsResult.body })
  }

  return dataSuccess({ deleted: true })
}

export async function getCompletePropertyStats(
  this: SessionAgent,
  { propertyUuid, userId }: { propertyUuid: string; userId: string },
) {
  const access = await buildAccessContext(this, userId)
  if (!canAccessSession(access)) return dataError('Permission denied')

  const items = this.ctx.storage.sql.exec(`SELECT uuid FROM roadmap_items`).toArray()
  const itemStats: PropertyVoteStats[] = []
  const participationByItem: Record<string, number> = {}

  for (const item of items) {
    const itemUuid = item.uuid as string
    const statsResult = await getPropertyVoteStats.call(this, { propertyUuid, itemUuid, userId })
    if (statsResult.ok) {
      itemStats.push(statsResult.body)
      participationByItem[itemUuid] = statsResult.body.totalVotes
    }
  }

  const uniqueVoters = new Set<string>()
  for (const stats of itemStats) {
    for (const vote of stats.votes) uniqueVoters.add(vote.username)
  }

  const completeStats: CompletePropertyStats = {
    propertyUuid,
    itemStats,
    totalVoters: uniqueVoters.size,
    participationByItem,
  }

  return zParse(completePropertyStatsSchema, completeStats)
}

export async function getPropertyVotes(this: SessionAgent, { userId }: { userId: string }) {
  const access = await buildAccessContext(this, userId)
  if (!canAccessSession(access)) return dataError('Permission denied')

  const rows = this.ctx.storage.sql.exec(`SELECT * FROM property_votes`).toArray()
  const transformed = rows.map((vote) => ({
    propertyUuid: vote.property_uuid,
    itemUuid: vote.item_uuid,
    username: vote.username,
    value: vote.value,
    createdAt: vote.created_at,
    updatedAt: vote.updated_at,
  }))
  return zParse(propertyVotesSchema, transformed)
}
