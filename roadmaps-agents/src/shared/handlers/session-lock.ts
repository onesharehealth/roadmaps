import { dataError, dataSuccess } from 'utils/data'

import {
  GENERAL_EVENTS,
  getGeneralChannelName,
  getSessionLockChannelName,
  SESSION_LOCK_EVENTS,
} from '../channels'
import { buildAccessContext, canAccessSession, canManageSharing, type SessionAgent } from '../session-handlers'
import type { SessionLockState } from '../session-schemas'

function getLockState(agent: SessionAgent): SessionLockState {
  const ps = agent.getPrivateState()
  return {
    isLocked: ps.isLocked ?? false,
    lockedAt: ps.lockedAt ?? null,
  }
}

export async function getSessionLock(this: SessionAgent, { userId }: { userId: string }) {
  const access = await buildAccessContext(this, userId)
  if (!canAccessSession(access)) return dataError('Permission denied')

  return dataSuccess(getLockState(this))
}

export async function setSessionLock(
  this: SessionAgent,
  { userId, isLocked }: { userId: string; isLocked: boolean },
) {
  const access = await buildAccessContext(this, userId)
  if (!canManageSharing(access)) return dataError('Permission denied')

  const lockedAt = isLocked ? Math.floor(Date.now() / 1000) : null
  await this.setPrivateStatePartial({ isLocked, lockedAt })

  const result = getLockState(this)

  const lockChannelName = getSessionLockChannelName(this.state.uuid)
  this.broadcastToChannel(lockChannelName, SESSION_LOCK_EVENTS.LOCK, result)

  const generalChannelName = getGeneralChannelName(this.state.uuid)
  this.broadcastToChannel(generalChannelName, GENERAL_EVENTS.SESSION_LOCK_UPDATED, result)

  return dataSuccess(result)
}
