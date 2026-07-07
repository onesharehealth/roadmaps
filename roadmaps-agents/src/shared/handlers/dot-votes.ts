import { dataError, dataSuccess } from 'utils/data'
import { zParse } from 'utils/zod'

import { DOT_VOTES_EVENTS, getDotVotesChannelName } from '../channels'
import { buildAccessContext, canAccessSession, canVote, type SessionAgent } from '../session-handlers'
import { assertSessionUnlocked } from '../session-lock-utils'
import {
  type CompleteDotStats,
  completeDotStatsSchema,
  dotVoteSchema,
  dotVotesSchema,
  type DotVoteStats,
  dotVoteStatsSchema,
} from '../session-schemas'
import { DEFAULT_DOT_VOTING_DOTS_PER_VOTER } from '../session-schemas'

export async function castDotVote(
  this: SessionAgent,
  {
    itemUuid,
    userId,
    dotPositionX,
    dotPositionY,
  }: {
    itemUuid: string
    userId: string
    dotPositionX: number
    dotPositionY: number
  },
) {
  const access = await buildAccessContext(this, userId)
  if (!canVote(access)) return dataError('Permission denied')

  const lockError = assertSessionUnlocked(this)
  if (lockError) return lockError

  const ps = this.getPrivateState()
  const itemExists = this.ctx.storage.sql.exec(`SELECT 1 FROM roadmap_items WHERE uuid = ?`, itemUuid).one()
  if (!itemExists) return dataError('Item not found')

  const dotsPerVoter = ps.dotVotingDotsPerVoter ?? DEFAULT_DOT_VOTING_DOTS_PER_VOTER
  const userVoteCount = this.ctx.storage.sql
    .exec(`SELECT COUNT(*) as count FROM dot_votes WHERE username = ?`, userId)
    .one() as { count: number }

  if ((userVoteCount?.count ?? 0) >= dotsPerVoter) {
    return dataError(`You have used all ${dotsPerVoter} of your available votes`)
  }

  const vote = this.ctx.storage.sql
    .exec(
      `INSERT INTO dot_votes (item_uuid, username, dot_position_x, dot_position_y, created_at, updated_at)
       VALUES (?, ?, ?, ?, UNIXEPOCH(), UNIXEPOCH()) RETURNING *`,
      itemUuid,
      userId,
      dotPositionX,
      dotPositionY,
    )
    .one()

  if (!vote) return dataError('Failed to cast dot vote')

  const parsed = zParse(dotVoteSchema, {
    id: vote.id,
    itemUuid: vote.item_uuid,
    username: vote.username,
    dotPositionX: vote.dot_position_x,
    dotPositionY: vote.dot_position_y,
    createdAt: vote.created_at,
    updatedAt: vote.updated_at,
  })

  if (!parsed.ok) return parsed

  const channelName = getDotVotesChannelName(this.state.uuid)
  this.broadcastToChannel(channelName, DOT_VOTES_EVENTS.CAST_CONFIRMED, { vote: parsed.body })

  const statsResult = await getDotVoteStats.call(this, { itemUuid, userId })
  if (statsResult.ok) {
    this.broadcastToChannel(channelName, DOT_VOTES_EVENTS.STATS, { stats: statsResult.body })
  }

  const completeStatsResult = await getCompleteDotStats.call(this, { userId })
  if (completeStatsResult.ok) {
    this.broadcastToChannel(channelName, DOT_VOTES_EVENTS.COMPLETE_STATS, { stats: completeStatsResult.body })
  }

  return parsed
}

export async function getDotVoteStats(
  this: SessionAgent,
  { itemUuid, userId }: { itemUuid: string; userId: string },
) {
  const access = await buildAccessContext(this, userId)
  if (!canAccessSession(access)) return dataError('Permission denied')

  const votes = this.ctx.storage.sql
    .exec(`SELECT * FROM dot_votes WHERE item_uuid = ? ORDER BY created_at DESC`, itemUuid)
    .toArray()

  const transformedVotes = votes.map((vote) => ({
    id: vote.id,
    itemUuid: vote.item_uuid,
    username: vote.username,
    dotPositionX: vote.dot_position_x,
    dotPositionY: vote.dot_position_y,
    createdAt: vote.created_at,
    updatedAt: vote.updated_at,
  }))

  const parsedVotes = zParse(dotVotesSchema, transformedVotes)
  if (!parsedVotes.ok) return parsedVotes

  const userVotes = userId ? parsedVotes.body.filter((vote) => vote.username === userId) : []

  const stats: DotVoteStats = {
    itemUuid,
    votes: parsedVotes.body,
    totalVotes: parsedVotes.body.length,
    userVotes,
  }

  return zParse(dotVoteStatsSchema, stats)
}

export async function removeDotVote(
  this: SessionAgent,
  {
    itemUuid,
    userId,
    dotPositionX,
    dotPositionY,
  }: {
    itemUuid: string
    userId: string
    dotPositionX: number
    dotPositionY: number
  },
) {
  const access = await buildAccessContext(this, userId)
  if (!canVote(access)) return dataError('Permission denied')

  const lockError = assertSessionUnlocked(this)
  if (lockError) return lockError

  this.ctx.storage.sql.exec(
    `DELETE FROM dot_votes WHERE item_uuid = ? AND username = ? AND dot_position_x = ? AND dot_position_y = ?`,
    itemUuid,
    userId,
    dotPositionX,
    dotPositionY,
  )

  const channelName = getDotVotesChannelName(this.state.uuid)
  this.broadcastToChannel(channelName, DOT_VOTES_EVENTS.REMOVE_CONFIRMED, { success: true })

  const statsResult = await getDotVoteStats.call(this, { itemUuid, userId })
  if (statsResult.ok) {
    this.broadcastToChannel(channelName, DOT_VOTES_EVENTS.STATS, { stats: statsResult.body })
  }

  const completeStatsResult = await getCompleteDotStats.call(this, { userId })
  if (completeStatsResult.ok) {
    this.broadcastToChannel(channelName, DOT_VOTES_EVENTS.COMPLETE_STATS, { stats: completeStatsResult.body })
  }

  return dataSuccess({ deleted: true })
}

export async function getCompleteDotStats(this: SessionAgent, { userId }: { userId: string }) {
  const access = await buildAccessContext(this, userId)
  if (!canAccessSession(access)) return dataError('Permission denied')

  const items = this.ctx.storage.sql.exec(`SELECT uuid FROM roadmap_items`).toArray()
  const itemStats: DotVoteStats[] = []
  const participationByItem: Record<string, number> = {}

  for (const item of items) {
    const itemUuid = item.uuid as string
    const statsResult = await getDotVoteStats.call(this, { itemUuid, userId })
    if (statsResult.ok) {
      itemStats.push(statsResult.body)
      participationByItem[itemUuid] = statsResult.body.totalVotes
    }
  }

  const uniqueVoters = new Set<string>()
  for (const stats of itemStats) {
    for (const vote of stats.votes) uniqueVoters.add(vote.username)
  }

  const ps = this.getPrivateState()
  const completeStats: CompleteDotStats = {
    itemStats,
    totalVoters: uniqueVoters.size,
    participationByItem,
    dotsPerVoter: ps.dotVotingDotsPerVoter ?? DEFAULT_DOT_VOTING_DOTS_PER_VOTER,
  }

  return zParse(completeDotStatsSchema, completeStats)
}

export async function getDotVotes(this: SessionAgent, { userId }: { userId: string }) {
  const access = await buildAccessContext(this, userId)
  if (!canAccessSession(access)) return dataError('Permission denied')

  const rows = this.ctx.storage.sql.exec(`SELECT * FROM dot_votes ORDER BY created_at DESC`).toArray()
  const transformed = rows.map((vote) => ({
    id: vote.id,
    itemUuid: vote.item_uuid,
    username: vote.username,
    dotPositionX: vote.dot_position_x,
    dotPositionY: vote.dot_position_y,
    createdAt: vote.created_at,
    updatedAt: vote.updated_at,
  }))
  return zParse(dotVotesSchema, transformed)
}
