import { dataError, dataSuccess } from 'utils/data'

import {
  GENERAL_EVENTS,
  getGeneralChannelName,
  getPropertyVotingSettingsChannelName,
  PROPERTY_VOTING_SETTINGS_EVENTS,
} from '../channels'
import { buildAccessContext, canAccessSession, canEditSession, type SessionAgent } from '../session-handlers'
import { assertSessionUnlocked } from '../session-lock-utils'
import type { PropertyVotingSettings } from '../session-schemas'
import { DEFAULT_REQUIRE_ALL_VOTERS_PRESENT } from '../session-schemas'

function getSettings(agent: SessionAgent): PropertyVotingSettings {
  const ps = agent.getPrivateState()
  return {
    requireAllVotersPresent: ps.requireAllVotersPresent ?? DEFAULT_REQUIRE_ALL_VOTERS_PRESENT,
  }
}

export async function getPropertyVotingSettings(this: SessionAgent, { userId }: { userId: string }) {
  const access = await buildAccessContext(this, userId)
  if (!canAccessSession(access)) return dataError('Permission denied')

  return dataSuccess(getSettings(this))
}

export async function setPropertyVotingSettings(
  this: SessionAgent,
  {
    userId,
    requireAllVotersPresent,
  }: {
    userId: string
    requireAllVotersPresent: boolean
  },
) {
  const access = await buildAccessContext(this, userId)
  if (!canEditSession(access)) return dataError('Permission denied')

  const lockError = assertSessionUnlocked(this)
  if (lockError) return lockError

  await this.setPrivateStatePartial({ requireAllVotersPresent })
  const result = getSettings(this)

  const settingsChannelName = getPropertyVotingSettingsChannelName(this.state.uuid)
  this.broadcastToChannel(settingsChannelName, PROPERTY_VOTING_SETTINGS_EVENTS.SETTINGS, result)

  const generalChannelName = getGeneralChannelName(this.state.uuid)
  this.broadcastToChannel(generalChannelName, GENERAL_EVENTS.PROPERTY_VOTING_SETTINGS_UPDATED, result)

  return dataSuccess(result)
}
