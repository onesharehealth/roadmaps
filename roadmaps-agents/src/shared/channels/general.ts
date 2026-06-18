import type { ChannelHandler } from 'websockets/server'

import type { SessionAgent } from '../session-handlers'

export class GeneralChannelHandler implements ChannelHandler {
  constructor(private agent: SessionAgent) {}

  async handle(): Promise<void> {
    throw new Error('General channel does not support client-initiated actions')
  }
}
