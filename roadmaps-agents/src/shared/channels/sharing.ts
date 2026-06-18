import type { ActionHandlerFunction, ChannelContext, ValidatorFunction } from 'websockets/server'

import { SHARING_ACTIONS, SHARING_EVENTS, type SharingAction } from '../channels'
import { getSharingInfoSchema, removeShareSchema, shareWithSchema, type SharingInfo } from '../session-schemas'
import { BaseSessionChannelHandler } from './base-session-channel-handler'
import { withActingUser } from './with-acting-user'

type SharingActionHandlers = {
  [K in SharingAction]: ActionHandlerFunction<SharingAction>
}

export class SharingChannelHandler extends BaseSessionChannelHandler<SharingAction, SharingActionHandlers> {
  protected readonly actionHandlers: SharingActionHandlers = {
    [SHARING_ACTIONS.GET_INFO]: this.handleGetInfo.bind(this),
    [SHARING_ACTIONS.SHARE_WITH]: this.handleShareWith.bind(this),
    [SHARING_ACTIONS.REMOVE_SHARE]: this.handleRemoveShare.bind(this),
  }

  private async handleGetInfo(validate: ValidatorFunction<SharingAction>, channel: ChannelContext) {
    await validate({
      action: SHARING_ACTIONS.GET_INFO,
      inputSchema: getSharingInfoSchema,
      agentMethod: () => this.agent.getSharingInfo({ userId: channel.userId }),
      onSuccess: async (_payload, result) => {
        channel.reply<SharingInfo>(SHARING_EVENTS.GET_INFO_CONFIRMED, result.body)
      },
    })
  }

  private async handleShareWith(validate: ValidatorFunction<SharingAction>, channel: ChannelContext) {
    await validate({
      action: SHARING_ACTIONS.SHARE_WITH,
      inputSchema: shareWithSchema,
      agentMethod: (payload) => this.agent.shareWith(withActingUser(channel, payload)),
      onSuccess: async () => {
        channel.reply(SHARING_EVENTS.SHARE_WITH_CONFIRMED, { success: true })
        await this.broadcastSharingInfo(channel)
      },
    })
  }

  private async handleRemoveShare(validate: ValidatorFunction<SharingAction>, channel: ChannelContext) {
    await validate({
      action: SHARING_ACTIONS.REMOVE_SHARE,
      inputSchema: removeShareSchema,
      agentMethod: (payload) => this.agent.removeShare(withActingUser(channel, payload)),
      onSuccess: async () => {
        channel.reply(SHARING_EVENTS.REMOVE_SHARE_CONFIRMED, { success: true })
        await this.broadcastSharingInfo(channel)
      },
    })
  }

  private async broadcastSharingInfo(channel: ChannelContext) {
    const sharingInfo = await this.agent.getSharingInfo()
    if (sharingInfo.ok) await channel.broadcast<SharingInfo>(SHARING_EVENTS.INFO, sharingInfo.body)
  }
}
