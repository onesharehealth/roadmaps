import type { SessionAgent } from './session-handlers'
import type { CompletePropertyStats, VotingProperty } from './session-schemas'

export async function buildSessionInitialState(
  agent: SessionAgent,
  userId: string,
): Promise<Record<string, unknown>> {
  const itemsResult = await agent.getAllItems()

  const initialData: Record<string, unknown> = {
    items: { items: itemsResult.ok ? itemsResult.body : [] },
  }

  const sessionState = agent.state
  if (!sessionState?.uuid) return initialData

  const sharingResult = await agent.getSharingInfo({ userId })
  if (sharingResult.ok) initialData.sharingInfo = sharingResult.body

  const sessionType = sessionState.sessionType

  if (sessionType === 'dot_voting') {
    const dotVotingAgent = agent as SessionAgent & {
      getCompleteDotStats: (args: { userId?: string }) => ReturnType<SessionAgent['getAllItems']>
      getDotVotingSettings: (args: { userId: string }) => ReturnType<SessionAgent['getAllItems']>
    }

    const dotStats = await dotVotingAgent.getCompleteDotStats({ userId })
    if (dotStats.ok) initialData.dotVoteStats = dotStats.body

    const settings = await dotVotingAgent.getDotVotingSettings({ userId })
    if (settings.ok) initialData.dotVotingSettings = settings.body
  }

  if (sessionType === 'timeline') {
    const timelineAgent = agent as SessionAgent & {
      getTimelineSettings: (args: { userId: string }) => ReturnType<SessionAgent['getAllItems']>
    }

    const settings = await timelineAgent.getTimelineSettings({ userId })
    if (settings.ok) initialData.timelineSettings = settings.body
  }

  if (sessionType === 'property_voting') {
    const propertyAgent = agent as SessionAgent & {
      getAllVotingProperties: () => ReturnType<SessionAgent['getAllItems']>
      getCompletePropertyStats: (args: {
        propertyUuid: string
        userId?: string
      }) => ReturnType<SessionAgent['getAllItems']>
    }

    const propertiesResult = await propertyAgent.getAllVotingProperties()
    if (propertiesResult.ok) {
      const properties = propertiesResult.body as VotingProperty[]
      initialData.votingProperties = { properties }

      const completePropertyStats: Record<string, CompletePropertyStats> = {}
      for (const property of properties) {
        const stats = await propertyAgent.getCompletePropertyStats({
          propertyUuid: property.uuid,
          userId,
        })
        if (stats.ok) completePropertyStats[property.uuid] = stats.body as CompletePropertyStats
      }
      initialData.completePropertyStats = completePropertyStats
    }
  }

  return initialData
}
