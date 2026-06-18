import { type ActionHandlerFunction,BaseChannelHandler } from 'websockets/server'

import type { SessionAgent } from '../session-handlers'

export abstract class BaseSessionChannelHandler<
  TAction extends string = string,
  THandlers extends Record<TAction, ActionHandlerFunction<TAction>> = Record<
    TAction,
    ActionHandlerFunction<TAction>
  >,
> extends BaseChannelHandler<TAction, THandlers> {
  constructor(protected agent: SessionAgent) {
    super()
  }
}
