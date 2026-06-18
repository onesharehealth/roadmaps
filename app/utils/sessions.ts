import type { SessionType } from 'roadmaps-agents/schemas'

export const sessionTypeLabels = {
  timeline: 'Roadmap',
  dot_voting: 'Dot Voting Session',
  property_voting: 'Alignment Voting Session',
} as const satisfies Record<SessionType, string>

export function defaultSessionName(sessionType: SessionType) {
  return `New ${sessionTypeLabels[sessionType]}`
}

const sessionTypeRoutes = {
  timeline: 'roadmap',
  dot_voting: 'voting',
  property_voting: 'property-voting',
} as const satisfies Record<SessionType, string>

export function sessionPath(sessionType: SessionType, uuid: string) {
  return `/${sessionTypeRoutes[sessionType]}/${uuid}`
}
