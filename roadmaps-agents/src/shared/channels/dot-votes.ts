import type { ActionHandlerFunction, ChannelContext, ValidatorFunction } from 'websockets/server'
import { z } from 'zod'

import { DOT_VOTES_ACTIONS, DOT_VOTES_EVENTS, type DotVotesAction } from '../channels'
import {
  castDotVoteSchema,
  type CompleteDotStats,
  type DotVote,
  type DotVoteStats,
  removeDotVoteSchema,
} from '../session-schemas'
import { BaseSessionChannelHandler } from './base-session-channel-handler'
import { withActingUser } from './with-acting-user'

const getDotVoteStatsSchema = z.object({
  itemUuid: z.string().uuid(),
})

const getCompleteDotStatsSchema = z.object({}).optional().default({})

type DotVotesActionHandlers = {
  [K in DotVotesAction]: ActionHandlerFunction<DotVotesAction>
}

export class DotVotesChannelHandler extends BaseSessionChannelHandler<DotVotesAction, DotVotesActionHandlers> {
  protected readonly actionHandlers: DotVotesActionHandlers = {
    [DOT_VOTES_ACTIONS.CAST]: this.handleCast.bind(this),
    [DOT_VOTES_ACTIONS.REMOVE]: this.handleRemove.bind(this),
    [DOT_VOTES_ACTIONS.GET_STATS]: this.handleGetStats.bind(this),
    [DOT_VOTES_ACTIONS.GET_COMPLETE_STATS]: this.handleGetCompleteStats.bind(this),
  }

  private async handleCast(validate: ValidatorFunction<DotVotesAction>, channel: ChannelContext) {
    await validate({
      action: DOT_VOTES_ACTIONS.CAST,
      inputSchema: castDotVoteSchema,
      agentMethod: (payload) => this.agent.castDotVote(withActingUser(channel, payload)),
      onSuccess: async (_payload, result) => {
        channel.reply<{ vote: DotVote }>('ack', { vote: result.body })
      },
    })
  }

  private async handleRemove(validate: ValidatorFunction<DotVotesAction>, channel: ChannelContext) {
    await validate({
      action: DOT_VOTES_ACTIONS.REMOVE,
      inputSchema: removeDotVoteSchema,
      agentMethod: (payload) => this.agent.removeDotVote(withActingUser(channel, payload)),
      onSuccess: async () => {
        channel.reply<{ success: boolean }>('ack', { success: true })
      },
    })
  }

  private async handleGetStats(validate: ValidatorFunction<DotVotesAction>, channel: ChannelContext) {
    await validate({
      action: DOT_VOTES_ACTIONS.GET_STATS,
      inputSchema: getDotVoteStatsSchema,
      agentMethod: (payload) =>
        this.agent.getDotVoteStats({ itemUuid: payload.itemUuid, userId: channel.userId }),
      onSuccess: async (_payload, result) => {
        channel.reply<{ stats: DotVoteStats }>(DOT_VOTES_EVENTS.STATS, { stats: result.body })
      },
    })
  }

  private async handleGetCompleteStats(validate: ValidatorFunction<DotVotesAction>, channel: ChannelContext) {
    await validate({
      action: DOT_VOTES_ACTIONS.GET_COMPLETE_STATS,
      inputSchema: getCompleteDotStatsSchema,
      agentMethod: () => this.agent.getCompleteDotStats({ userId: channel.userId }),
      onSuccess: async (_payload, result) => {
        channel.reply<{ stats: CompleteDotStats }>(DOT_VOTES_EVENTS.COMPLETE_STATS, { stats: result.body })
      },
    })
  }
}
