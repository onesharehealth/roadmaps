import { dataError } from 'utils/data'

import type { SessionAgent } from './session-handlers'

export function isSessionLocked(agent: SessionAgent): boolean {
  return agent.getPrivateState().isLocked === true
}

export function assertSessionUnlocked(agent: SessionAgent) {
  if (isSessionLocked(agent)) {
    return dataError('This session is locked')
  }
  return null
}
