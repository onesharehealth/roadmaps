/**
 * Cycle utilities for roadmap planning
 *
 * Cycles are configurable via TimelineSettings. Full cycle period = cycle_length_weeks + cooldown_weeks.
 */

export interface Cycle {
  number: number
  startDate: Date
  endDate: Date
}

export interface TimelineSettings {
  cycleLengthWeeks: number
  cooldownWeeks: number
  startDate: string // ISO date YYYY-MM-DD
  cycleStartNumber: number
}

const MS_PER_DAY = 1000 * 60 * 60 * 24

function parseStartDate(isoDate: string): Date {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Date(year, month - 1, day)
}

/**
 * Get the cycle for a specific date
 */
function getCycleForDate(date: Date, settings: TimelineSettings): Cycle {
  const startDate = parseStartDate(settings.startDate)
  const periodWeeks = settings.cycleLengthWeeks + settings.cooldownWeeks
  const periodDays = periodWeeks * 7

  const daysSinceStart = Math.floor(
    (date.getTime() - startDate.getTime()) / MS_PER_DAY,
  )
  const cyclesSinceStart = Math.floor(daysSinceStart / periodDays)
  const cycleNumber = settings.cycleStartNumber + cyclesSinceStart

  return getCycleByNumber(cycleNumber, settings)
}

/**
 * Get a cycle by its number
 */
function getCycleByNumber(
  cycleNumber: number,
  settings: TimelineSettings,
): Cycle {
  const startDate = parseStartDate(settings.startDate)
  const periodWeeks = settings.cycleLengthWeeks + settings.cooldownWeeks
  const periodDays = periodWeeks * 7

  const cyclesFromStart = cycleNumber - settings.cycleStartNumber
  const daysFromStart = cyclesFromStart * periodDays

  const cycleStartDate = new Date(startDate)
  cycleStartDate.setDate(cycleStartDate.getDate() + daysFromStart)

  const cycleEndDate = new Date(cycleStartDate)
  cycleEndDate.setDate(cycleEndDate.getDate() + periodDays - 1)

  return {
    number: cycleNumber,
    startDate: cycleStartDate,
    endDate: cycleEndDate,
  }
}

/**
 * Get the cycle for a specific item position (0-based index)
 * Position 0 = current cycle, Position 1 = next cycle, etc.
 */
export function getCycleForPosition(
  position: number,
  settings: TimelineSettings,
): Cycle {
  const currentCycle = getCycleForDate(new Date(), settings)
  return getCycleByNumber(currentCycle.number + position, settings)
}

/**
 * Format a date as MM/DD
 */
function formatShortDate(date: Date): string {
  const month = date.getMonth() + 1
  const day = date.getDate()
  return `${month}/${day}`
}

/**
 * Format a date as "Day Month Year" (e.g., "6 October 2025")
 */
function formatLongDate(date: Date): string {
  const day = date.getDate()
  const month = date.toLocaleString('en-US', { month: 'short' })
  const year = date.getFullYear()
  return `${day} ${month} ${year}`
}

/**
 * Format a cycle as "Cycle 14 (10/6 - 11/2)"
 */
function formatCycle(cycle: Cycle): string {
  return `Cycle ${cycle.number} (${formatShortDate(
    cycle.startDate,
  )} - ${formatShortDate(cycle.endDate)})`
}

/**
 * Format a cycle with long dates as "Cycle 14 (6 October 2025 - 2 November 2025)"
 */
export function formatCycleLong(cycle: Cycle): string {
  return `${formatLongDate(cycle.startDate)} - ${formatLongDate(cycle.endDate)}`
}

/**
 * Format a cycle for compact display as "C14"
 */
function formatCycleCompact(cycle: Cycle): string {
  return `C${cycle.number}`
}

/**
 * Get the zone for a cycle position
 * - Position 0: Stable (current cycle)
 * - Position 1: Planning (next cycle)
 * - Positions 2+: Strategic
 */
function getZoneForPosition(
  position: number,
): 'stable' | 'planning' | 'strategic' {
  if (position === 0) return 'stable'
  if (position === 1) return 'planning'
  return 'strategic'
}

/**
 * Get zone display information
 */
function getZoneInfo(zone: 'stable' | 'planning' | 'strategic') {
  switch (zone) {
    case 'stable':
      return {
        title: 'Generally Stable Zone',
        description: 'Current cycle',
        cycleCount: 1,
      }
    case 'planning':
      return {
        title: 'Planning Zone',
        description: 'Next cycle',
        cycleCount: 1,
      }
    case 'strategic':
      return {
        title: 'Strategic Zone',
        description: 'Following cycles',
        cycleCount: Infinity,
      }
  }
}

/**
 * Get the cycle position for a given cumulative week offset from timeline start
 */
function getCyclePositionForWeeks(
  cumulativeWeeks: number,
  settings: TimelineSettings,
): number {
  const periodWeeks = settings.cycleLengthWeeks + settings.cooldownWeeks
  return Math.floor(cumulativeWeeks / periodWeeks)
}

/**
 * Get the zone for an item based on cumulative week durations
 * Zone boundaries: position 0 = stable, 1 = planning, 2+ = strategic
 */
function getZoneForItem(
  index: number,
  durationWeeks: number[],
  settings: TimelineSettings,
): 'stable' | 'planning' | 'strategic' {
  let cumulativeWeeks = 0
  for (let i = 0; i < index; i++) {
    cumulativeWeeks += durationWeeks[i] ?? 6
  }
  const cyclePosition = getCyclePositionForWeeks(cumulativeWeeks, settings)
  return getZoneForPosition(cyclePosition)
}

/**
 * Check if a week index falls within a cooldown period
 */
function isWeekInCooldown(
  weekIndex: number,
  settings: TimelineSettings,
): boolean {
  const period = settings.cycleLengthWeeks + settings.cooldownWeeks
  const offsetInPeriod = weekIndex % period
  return offsetInPeriod >= settings.cycleLengthWeeks
}

/**
 * Compute item positions with cooldown bumps. Items cannot overlap cooldown periods;
 * if an item would run into cooldown, it is bumped to start after the cooldown.
 */
export function computeItemPositionsWithCooldown<
  T extends { durationWeeks: number },
>(
  items: T[],
  settings: TimelineSettings,
): {
  item: T
  index: number
  startWeeks: number
  zone: 'stable' | 'planning' | 'strategic'
}[] {
  const period = settings.cycleLengthWeeks + settings.cooldownWeeks
  let nextAvailableWeek = 0

  return items.map((item, index) => {
    const duration = item.durationWeeks
    let position = nextAvailableWeek

    for (;;) {
      let valid = true
      for (let w = position; w < position + duration; w++) {
        if (isWeekInCooldown(w, settings)) {
          valid = false
          break
        }
      }
      if (valid) break
      position = Math.floor(position / period + 1) * period
    }

    nextAvailableWeek = position + duration
    const cyclePosition = getCyclePositionForWeeks(position, settings)
    const zone = getZoneForPosition(cyclePosition)
    return { item, index, startWeeks: position, zone }
  })
}
