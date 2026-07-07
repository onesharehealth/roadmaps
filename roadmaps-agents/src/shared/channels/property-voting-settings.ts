import type { ActionHandlerFunction, ChannelContext, ValidatorFunction } from 'websockets/server'

import {
  PROPERTY_VOTING_SETTINGS_ACTIONS,
  PROPERTY_VOTING_SETTINGS_EVENTS,
  type PropertyVotingSettingsAction,
} from '../channels'
import {
  getPropertyVotingSettingsSchema,
  type PropertyVotingSettings,
  setPropertyVotingSettingsSchema,
} from '../session-schemas'
import { BaseSessionChannelHandler } from './base-session-channel-handler'

type PropertyVotingSettingsActionHandlers = {
  [K in PropertyVotingSettingsAction]: ActionHandlerFunction<PropertyVotingSettingsAction>
}

export class PropertyVotingSettingsChannelHandler extends BaseSessionChannelHandler<
  PropertyVotingSettingsAction,
  PropertyVotingSettingsActionHandlers
> {
  protected readonly actionHandlers: PropertyVotingSettingsActionHandlers = {
    [PROPERTY_VOTING_SETTINGS_ACTIONS.GET_SETTINGS]: this.handleGetSettings.bind(this),
    [PROPERTY_VOTING_SETTINGS_ACTIONS.SET_SETTINGS]: this.handleSetSettings.bind(this),
  }

  private async handleGetSettings(
    validate: ValidatorFunction<PropertyVotingSettingsAction>,
    channel: ChannelContext,
  ) {
    await validate({
      action: PROPERTY_VOTING_SETTINGS_ACTIONS.GET_SETTINGS,
      inputSchema: getPropertyVotingSettingsSchema,
      agentMethod: () => this.agent.getPropertyVotingSettings({ userId: channel.userId }),
      onSuccess: async (_payload, result) => {
        channel.reply<PropertyVotingSettings>(PROPERTY_VOTING_SETTINGS_EVENTS.GET_SETTINGS_CONFIRMED, result.body)
      },
    })
  }

  private async handleSetSettings(
    validate: ValidatorFunction<PropertyVotingSettingsAction>,
    channel: ChannelContext,
  ) {
    await validate({
      action: PROPERTY_VOTING_SETTINGS_ACTIONS.SET_SETTINGS,
      inputSchema: setPropertyVotingSettingsSchema,
      agentMethod: (payload) =>
        this.agent.setPropertyVotingSettings({
          userId: channel.userId,
          requireAllVotersPresent: payload.requireAllVotersPresent,
        }),
      onSuccess: async () => {
        channel.reply(PROPERTY_VOTING_SETTINGS_EVENTS.SET_SETTINGS_CONFIRMED, { success: true })
      },
    })
  }
}
