import type { ActionHandlerFunction, ChannelContext, ValidatorFunction } from 'websockets/server'

import {
  DOT_VOTING_SETTINGS_ACTIONS,
  DOT_VOTING_SETTINGS_EVENTS,
  type DotVotingSettingsAction,
} from '../channels'
import {
  type DotVotingSettings,
  getDotVotingSettingsSchema,
  resetDotVotesSchema,
  setDotVotingSettingsSchema,
} from '../session-schemas'
import { BaseSessionChannelHandler } from './base-session-channel-handler'

type DotVotingSettingsActionHandlers = {
  [K in DotVotingSettingsAction]: ActionHandlerFunction<DotVotingSettingsAction>
}

export class DotVotingSettingsChannelHandler extends BaseSessionChannelHandler<
  DotVotingSettingsAction,
  DotVotingSettingsActionHandlers
> {
  protected readonly actionHandlers: DotVotingSettingsActionHandlers = {
    [DOT_VOTING_SETTINGS_ACTIONS.GET_SETTINGS]: this.handleGetSettings.bind(this),
    [DOT_VOTING_SETTINGS_ACTIONS.SET_SETTINGS]: this.handleSetSettings.bind(this),
    [DOT_VOTING_SETTINGS_ACTIONS.RESET_VOTES]: this.handleResetVotes.bind(this),
  }

  private async handleGetSettings(validate: ValidatorFunction<DotVotingSettingsAction>, channel: ChannelContext) {
    await validate({
      action: DOT_VOTING_SETTINGS_ACTIONS.GET_SETTINGS,
      inputSchema: getDotVotingSettingsSchema,
      agentMethod: () => this.agent.getDotVotingSettings({ userId: channel.userId }),
      onSuccess: async (_payload, result) => {
        channel.reply<DotVotingSettings>(DOT_VOTING_SETTINGS_EVENTS.GET_SETTINGS_CONFIRMED, result.body)
      },
    })
  }

  private async handleSetSettings(validate: ValidatorFunction<DotVotingSettingsAction>, channel: ChannelContext) {
    await validate({
      action: DOT_VOTING_SETTINGS_ACTIONS.SET_SETTINGS,
      inputSchema: setDotVotingSettingsSchema,
      agentMethod: (payload) =>
        this.agent.setDotVotingSettings({
          userId: channel.userId,
          dotsPerVoter: payload.dotsPerVoter,
        }),
      onSuccess: async () => {
        channel.reply(DOT_VOTING_SETTINGS_EVENTS.SET_SETTINGS_CONFIRMED, { success: true })
      },
    })
  }

  private async handleResetVotes(validate: ValidatorFunction<DotVotingSettingsAction>, channel: ChannelContext) {
    await validate({
      action: DOT_VOTING_SETTINGS_ACTIONS.RESET_VOTES,
      inputSchema: resetDotVotesSchema,
      agentMethod: () => this.agent.resetDotVotes({ userId: channel.userId }),
      onSuccess: async () => {
        channel.reply(DOT_VOTING_SETTINGS_EVENTS.RESET_VOTES_CONFIRMED, { success: true })
      },
    })
  }
}
