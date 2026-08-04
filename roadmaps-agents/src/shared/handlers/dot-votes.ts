import { dataError, dataSuccess } from 'utils/data'
import { zParse } from 'utils/zod'

import { DOT_VOTES_EVENTS, getDotVotesChannelName } from '../channels'
import { buildAccessContext, canAccessSession, canVote, type SessionAgent } from '../session-handlers'
import { assertSessionUnlocked } from '../session-lock-utils'
import {
  type CompleteDotStats,
  completeDotStatsSchema,
  type DotVote,
  dotVoteSchema,
  dotVotesSchema,
  type DotVoteStats,
  dotVoteStatsSchema,
} from '../session-schemas'
import { DEFAULT_DOT_VOTING_DOTS_PER_VOTER } from '../session-schemas'

function mapVoteRow(vote: Record<string, unknown>): DotVote {
  return {
    id: vote.id as number,
    itemUuid: vote.item_uuid as string,
    username: vote.username as string,
    dotPositionX: vote.dot_position_x as number,
    dotPositionY: vote.dot_position_y as number,
    createdAt: vote.created_at as number,
    updatedAt: vote.updated_at as number,
  }
}

/** Unauthorized local read — caller must already have authorized this message. */
function readItemStats(agent: SessionAgent, { itemUuid, userId }: { itemUuid: string; userId: string }) {
  const votes = agent.ctx.storage.sql
    .exec(`SELECT * FROM dot_votes WHERE item_uuid = ? ORDER BY created_at DESC`, itemUuid)
    .toArray()
    .map(mapVoteRow)

  const stats: DotVoteStats = {
    itemUuid,
    votes,
    totalVotes: votes.length,
    userVotes: votes.filter((vote) => vote.username === userId),
  }

  return zParse(dotVoteStatsSchema, stats)
}

/** Unauthorized local read — caller must already have authorized this message. */
function readCompleteStats(agent: SessionAgent, { userId }: { userId: string }) {
  const items = agent.ctx.storage.sql.exec(`SELECT uuid FROM roadmap_items`).toArray()
  const rows = agent.ctx.storage.sql.exec(`SELECT * FROM dot_votes ORDER BY created_at DESC`).toArray()

  const votesByItem = new Map<string, DotVote[]>()
  for (const row of rows) {
    const vote = mapVoteRow(row)
    const list = votesByItem.get(vote.itemUuid)
    if (list) list.push(vote)
    else votesByItem.set(vote.itemUuid, [vote])
  }

  const itemStats: DotVoteStats[] = []
  const participationByItem: Record<string, number> = {}
  const uniqueVoters = new Set<string>()

  for (const item of items) {
    const itemUuid = item.uuid as string
    const votes = votesByItem.get(itemUuid) ?? []
    for (const vote of votes) uniqueVoters.add(vote.username)
    itemStats.push({
      itemUuid,
      votes,
      totalVotes: votes.length,
      userVotes: votes.filter((vote) => vote.username === userId),
    })
    participationByItem[itemUuid] = votes.length
  }

  const ps = agent.getPrivateState()
  const completeStats: CompleteDotStats = {
    itemStats,
    totalVoters: uniqueVoters.size,
    participationByItem,
    dotsPerVoter: ps.dotVotingDotsPerVoter ?? DEFAULT_DOT_VOTING_DOTS_PER_VOTER,
  }

  return zParse(completeDotStatsSchema, completeStats)
}

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

  const completeStatsResult = readCompleteStats(this, { userId })
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
  return readItemStats(this, { itemUuid, userId })
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

  const completeStatsResult = readCompleteStats(this, { userId })
  if (completeStatsResult.ok) {
    this.broadcastToChannel(channelName, DOT_VOTES_EVENTS.COMPLETE_STATS, { stats: completeStatsResult.body })
  }

  return dataSuccess({ deleted: true })
}

export async function getCompleteDotStats(this: SessionAgent, { userId }: { userId: string }) {
  const access = await buildAccessContext(this, userId)
  if (!canAccessSession(access)) return dataError('Permission denied')
  return readCompleteStats(this, { userId })
}

export async function getDotVotes(this: SessionAgent, { userId }: { userId: string }) {
  const access = await buildAccessContext(this, userId)
  if (!canAccessSession(access)) return dataError('Permission denied')

  const rows = this.ctx.storage.sql.exec(`SELECT * FROM dot_votes ORDER BY created_at DESC`).toArray()
  return zParse(dotVotesSchema, rows.map(mapVoteRow))
}
