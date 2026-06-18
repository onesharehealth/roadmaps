import type { SessionType } from 'roadmaps-agents/schemas'

/** WebSocket agent party names (kebab-case class names for useWebSocketAgent) */
const sessionAgentNames = {
  timeline: 'timeline-session-agent',
  dot_voting: 'dot-voting-session-agent',
  property_voting: 'property-voting-session-agent',
} as const satisfies Record<SessionType, string>

export function getSessionAgentName(sessionType: SessionType) {
  return sessionAgentNames[sessionType]
}
