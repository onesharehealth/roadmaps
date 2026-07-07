import type { ActionHandlerFunction, ChannelContext, ValidatorFunction } from 'websockets/server'

import { SESSION_LOCK_ACTIONS, SESSION_LOCK_EVENTS, type SessionLockAction } from '../channels'
import { getSessionLockSchema, type SessionLockState,setSessionLockSchema } from '../session-schemas'
import { BaseSessionChannelHandler } from './base-session-channel-handler'

type SessionLockActionHandlers = {
  [K in SessionLockAction]: ActionHandlerFunction<SessionLockAction>
}

export class SessionLockChannelHandler extends BaseSessionChannelHandler<
  SessionLockAction,
  SessionLockActionHandlers
> {
  protected readonly actionHandlers: SessionLockActionHandlers = {
    [SESSION_LOCK_ACTIONS.GET_LOCK]: this.handleGetLock.bind(this),
    [SESSION_LOCK_ACTIONS.SET_LOCK]: this.handleSetLock.bind(this),
  }

  private async handleGetLock(validate: ValidatorFunction<SessionLockAction>, channel: ChannelContext) {
    await validate({
      action: SESSION_LOCK_ACTIONS.GET_LOCK,
      inputSchema: getSessionLockSchema,
      agentMethod: () => this.agent.getSessionLock({ userId: channel.userId }),
      onSuccess: async (_payload, result) => {
        channel.reply<SessionLockState>(SESSION_LOCK_EVENTS.GET_LOCK_CONFIRMED, result.body)
      },
    })
  }

  private async handleSetLock(validate: ValidatorFunction<SessionLockAction>, channel: ChannelContext) {
    await validate({
      action: SESSION_LOCK_ACTIONS.SET_LOCK,
      inputSchema: setSessionLockSchema,
      agentMethod: (payload) =>
        this.agent.setSessionLock({
          userId: channel.userId,
          isLocked: payload.isLocked,
        }),
      onSuccess: async () => {
        channel.reply(SESSION_LOCK_EVENTS.SET_LOCK_CONFIRMED, { success: true })
      },
    })
  }
}
