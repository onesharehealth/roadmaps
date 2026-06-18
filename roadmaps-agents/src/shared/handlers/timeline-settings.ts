import { dataError, dataSuccess } from 'utils/data'

import { GENERAL_EVENTS, getGeneralChannelName } from '../channels'
import { buildAccessContext, canAccessSession, canEditSession, type SessionAgent } from '../session-handlers'
import type { RoadmapTimelineSettings } from '../session-schemas'

function getEffectiveStartDate(ps: { timelineStartDate?: string | null }) {
  if (ps.timelineStartDate) return ps.timelineStartDate
  return new Date().toISOString().slice(0, 10)
}

export async function getTimelineSettings(this: SessionAgent, { userId }: { userId: string }) {
  const access = await buildAccessContext(this, userId)
  if (!canAccessSession(access)) return dataError('Permission denied')

  const ps = this.getPrivateState()
  const settings: RoadmapTimelineSettings = {
    cycleLengthWeeks: ps.timelineCycleLengthWeeks ?? 6,
    cooldownWeeks: ps.timelineCooldownWeeks ?? 2,
    startDate: getEffectiveStartDate(ps),
    cycleStartNumber: ps.timelineCycleStartNumber ?? 19,
  }

  return dataSuccess(settings)
}

export async function updateTimelineSettings(
  this: SessionAgent,
  {
    userId,
    cycleLengthWeeks,
    cooldownWeeks,
    startDate,
    cycleStartNumber,
  }: {
    userId: string
    cycleLengthWeeks?: number
    cooldownWeeks?: number
    startDate?: string
    cycleStartNumber?: number
  },
) {
  const access = await buildAccessContext(this, userId)
  if (!canEditSession(access)) return dataError('Permission denied')

  const ps = this.getPrivateState()
  const partialState: Partial<typeof ps> = {}

  if (cycleLengthWeeks !== undefined) {
    if (!Number.isInteger(cycleLengthWeeks) || cycleLengthWeeks < 1) {
      return dataError('Cycle length must be a positive integer')
    }
    partialState.timelineCycleLengthWeeks = cycleLengthWeeks
  }
  if (cooldownWeeks !== undefined) {
    if (!Number.isInteger(cooldownWeeks) || cooldownWeeks < 0) {
      return dataError('Cooldown weeks must be a non-negative integer')
    }
    partialState.timelineCooldownWeeks = cooldownWeeks
  }
  if (startDate !== undefined) partialState.timelineStartDate = startDate || null
  if (cycleStartNumber !== undefined) {
    if (!Number.isInteger(cycleStartNumber) || cycleStartNumber < 1) {
      return dataError('Cycle start number must be a positive integer')
    }
    partialState.timelineCycleStartNumber = cycleStartNumber
  }

  await this.setPrivateStatePartial(partialState)

  const updatedPs = this.getPrivateState()
  const result: RoadmapTimelineSettings = {
    cycleLengthWeeks: updatedPs.timelineCycleLengthWeeks ?? 6,
    cooldownWeeks: updatedPs.timelineCooldownWeeks ?? 2,
    startDate: getEffectiveStartDate(updatedPs),
    cycleStartNumber: updatedPs.timelineCycleStartNumber ?? 19,
  }

  this.broadcastToChannel(
    getGeneralChannelName(this.state.uuid),
    GENERAL_EVENTS.TIMELINE_SETTINGS_UPDATED,
    result,
  )
  return dataSuccess(result)
}
