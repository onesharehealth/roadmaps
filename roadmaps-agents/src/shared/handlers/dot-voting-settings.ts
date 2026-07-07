import { dataError, dataSuccess } from 'utils/data'

import {
  DOT_VOTES_EVENTS,
  DOT_VOTING_SETTINGS_EVENTS,
  GENERAL_EVENTS,
  getDotVotesChannelName,
  getDotVotingSettingsChannelName,
  getGeneralChannelName,
} from '../channels'
import { buildAccessContext, canEditSession, canVote, type SessionAgent } from '../session-handlers'
import { assertSessionUnlocked } from '../session-lock-utils'
import type { DotVotingSettings } from '../session-schemas'
import { DEFAULT_DOT_VOTING_DOTS_PER_VOTER } from '../session-schemas'

export async function getDotVotingSettings(this: SessionAgent, { userId }: { userId: string }) {
  const access = await buildAccessContext(this, userId)
  if (!canVote(access)) return dataError('Permission denied')

  const ps = this.getPrivateState()
  return dataSuccess({
    dotsPerVoter: ps.dotVotingDotsPerVoter ?? DEFAULT_DOT_VOTING_DOTS_PER_VOTER,
  } satisfies DotVotingSettings)
}

export async function setDotVotingSettings(
  this: SessionAgent,
  { userId, dotsPerVoter }: { userId: string; dotsPerVoter: number },
) {
  const access = await buildAccessContext(this, userId)
  if (!canEditSession(access)) return dataError('Permission denied')

  const lockError = assertSessionUnlocked(this)
  if (lockError) return lockError

  if (!Number.isInteger(dotsPerVoter) || dotsPerVoter < 1) {
    return dataError('Dots per voter must be a positive integer')
  }
  if (dotsPerVoter > 1000) return dataError('Dots per voter cannot exceed 1000')

  await this.setPrivateStatePartial({ dotVotingDotsPerVoter: dotsPerVoter })
  const result: DotVotingSettings = { dotsPerVoter }

  const settingsChannelName = getDotVotingSettingsChannelName(this.state.uuid)
  this.broadcastToChannel(settingsChannelName, DOT_VOTING_SETTINGS_EVENTS.SETTINGS, result)

  const generalChannelName = getGeneralChannelName(this.state.uuid)
  this.broadcastToChannel(generalChannelName, GENERAL_EVENTS.DOT_VOTING_SETTINGS_UPDATED, result)

  return dataSuccess(result)
}

export async function resetDotVotes(this: SessionAgent, { userId }: { userId: string }) {
  const access = await buildAccessContext(this, userId)
  if (!canEditSession(access)) return dataError('Permission denied')

  const lockError = assertSessionUnlocked(this)
  if (lockError) return lockError

  this.ctx.storage.sql.exec(`DELETE FROM dot_votes`)

  const dotStats = await this.getCompleteDotStats({ userId })
  if (dotStats.ok) {
    this.broadcastToChannel(getDotVotesChannelName(this.state.uuid), DOT_VOTES_EVENTS.COMPLETE_STATS, {
      stats: dotStats.body,
    })
  }

  return dataSuccess({ success: true as const })
}
