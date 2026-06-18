import type { ActionHandlerFunction, ChannelContext, ValidatorFunction } from 'websockets/server'
import { z } from 'zod'

import { PROPERTY_VOTES_ACTIONS, PROPERTY_VOTES_EVENTS, type PropertyVotesAction } from '../channels'
import {
  castPropertyVoteSchema,
  type CompletePropertyStats,
  type PropertyVoteStats,
  removePropertyVoteSchema,
} from '../session-schemas'
import { BaseSessionChannelHandler } from './base-session-channel-handler'
import { withActingUser } from './with-acting-user'

const getPropertyVoteStatsSchema = z.object({
  propertyUuid: z.string().uuid(),
  itemUuid: z.string().uuid(),
})

const getCompletePropertyStatsSchema = z.object({
  propertyUuid: z.string().uuid(),
})

type PropertyVotesActionHandlers = {
  [K in PropertyVotesAction]: ActionHandlerFunction<PropertyVotesAction>
}

export class PropertyVotesChannelHandler extends BaseSessionChannelHandler<
  PropertyVotesAction,
  PropertyVotesActionHandlers
> {
  protected readonly actionHandlers: PropertyVotesActionHandlers = {
    [PROPERTY_VOTES_ACTIONS.CAST]: this.handleCast.bind(this),
    [PROPERTY_VOTES_ACTIONS.REMOVE]: this.handleRemove.bind(this),
    [PROPERTY_VOTES_ACTIONS.GET_STATS]: this.handleGetStats.bind(this),
    [PROPERTY_VOTES_ACTIONS.GET_COMPLETE_STATS]: this.handleGetCompleteStats.bind(this),
  }

  private async handleCast(validate: ValidatorFunction<PropertyVotesAction>, channel: ChannelContext) {
    await validate({
      action: PROPERTY_VOTES_ACTIONS.CAST,
      inputSchema: castPropertyVoteSchema,
      agentMethod: (payload) => this.agent.castPropertyVote(withActingUser(channel, payload)),
      onSuccess: async (_payload, result) => {
        channel.reply('ack', { vote: result.body })
      },
    })
  }

  private async handleRemove(validate: ValidatorFunction<PropertyVotesAction>, channel: ChannelContext) {
    await validate({
      action: PROPERTY_VOTES_ACTIONS.REMOVE,
      inputSchema: removePropertyVoteSchema,
      agentMethod: (payload) => this.agent.removePropertyVote(withActingUser(channel, payload)),
      onSuccess: async () => {
        channel.reply('ack', { success: true })
      },
    })
  }

  private async handleGetStats(validate: ValidatorFunction<PropertyVotesAction>, channel: ChannelContext) {
    await validate({
      action: PROPERTY_VOTES_ACTIONS.GET_STATS,
      inputSchema: getPropertyVoteStatsSchema,
      agentMethod: (payload) =>
        this.agent.getPropertyVoteStats({
          ...payload,
          userId: channel.userId,
        }),
      onSuccess: async (_payload, result) => {
        channel.reply<{ stats: PropertyVoteStats }>(PROPERTY_VOTES_EVENTS.STATS, { stats: result.body })
      },
    })
  }

  private async handleGetCompleteStats(
    validate: ValidatorFunction<PropertyVotesAction>,
    channel: ChannelContext,
  ) {
    await validate({
      action: PROPERTY_VOTES_ACTIONS.GET_COMPLETE_STATS,
      inputSchema: getCompletePropertyStatsSchema,
      agentMethod: (payload) =>
        this.agent.getCompletePropertyStats({
          propertyUuid: payload.propertyUuid,
          userId: channel.userId,
        }),
      onSuccess: async (_payload, result) => {
        channel.reply<{ stats: CompletePropertyStats }>(PROPERTY_VOTES_EVENTS.COMPLETE_STATS, {
          stats: result.body,
        })
      },
    })
  }
}
