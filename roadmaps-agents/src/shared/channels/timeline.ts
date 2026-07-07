import type { ActionHandlerFunction, ChannelContext, ValidatorFunction } from 'websockets/server'
import { z } from 'zod'

import { ROADMAP_TIMELINE_ACTIONS, ROADMAP_TIMELINE_EVENTS, type RoadmapTimelineAction } from '../channels'
import {
  reorderTimelineItemsSchema,
  type RoadmapItem,
  type RoadmapStatus,
  setRoadmapStatusSchema,
} from '../session-schemas'
import { BaseSessionChannelHandler } from './base-session-channel-handler'
import { withActingUser } from './with-acting-user'

const getAllItemsByStatusSchema = z.object({}).optional().default({})

type TimelineActionHandlers = {
  [K in RoadmapTimelineAction]: ActionHandlerFunction<RoadmapTimelineAction>
}

export class TimelineChannelHandler extends BaseSessionChannelHandler<
  RoadmapTimelineAction,
  TimelineActionHandlers
> {
  protected readonly actionHandlers: TimelineActionHandlers = {
    [ROADMAP_TIMELINE_ACTIONS.SET_STATUS]: this.handleSetStatus.bind(this),
    [ROADMAP_TIMELINE_ACTIONS.REORDER_TIMELINE]: this.handleReorderTimeline.bind(this),
    [ROADMAP_TIMELINE_ACTIONS.GET_TIMELINE_ITEMS]: this.handleGetTimelineItems.bind(this),
  }

  private async handleSetStatus(validate: ValidatorFunction<RoadmapTimelineAction>, channel: ChannelContext) {
    await validate({
      action: ROADMAP_TIMELINE_ACTIONS.SET_STATUS,
      inputSchema: setRoadmapStatusSchema,
      agentMethod: (payload) => this.agent.setRoadmapStatus(withActingUser(channel, payload)),
      onSuccess: async () => {
        const allItemsResult = await this.agent.getAllItemsByStatus({ userId: channel.userId })
        if (allItemsResult.ok) {
          await channel.broadcast<{
            itemsByStatus: Record<RoadmapStatus, RoadmapItem[]>
          }>(ROADMAP_TIMELINE_EVENTS.TIMELINE_ITEMS, {
            itemsByStatus: allItemsResult.body,
          })
        }
      },
    })
  }

  private async handleReorderTimeline(
    validate: ValidatorFunction<RoadmapTimelineAction>,
    channel: ChannelContext,
  ) {
    await validate({
      action: ROADMAP_TIMELINE_ACTIONS.REORDER_TIMELINE,
      inputSchema: reorderTimelineItemsSchema,
      agentMethod: (payload) => this.agent.reorderTimelineItems(withActingUser(channel, payload)),
      onSuccess: async () => {},
    })
  }

  private async handleGetTimelineItems(
    validate: ValidatorFunction<RoadmapTimelineAction>,
    channel: ChannelContext,
  ) {
    await validate({
      action: ROADMAP_TIMELINE_ACTIONS.GET_TIMELINE_ITEMS,
      inputSchema: getAllItemsByStatusSchema,
      agentMethod: () => this.agent.getAllItemsByStatus({ userId: channel.userId }),
      onSuccess: async (_payload, result) => {
        channel.reply<{ itemsByStatus: Record<RoadmapStatus, RoadmapItem[]> }>(
          ROADMAP_TIMELINE_EVENTS.TIMELINE_ITEMS,
          { itemsByStatus: result.body },
        )
      },
    })
  }
}
