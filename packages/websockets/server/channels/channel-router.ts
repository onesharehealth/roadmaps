import type { ChannelContext, ChannelHandler, ChannelMessage } from '../types'

/**
 * Simple channel router for managing channel handlers
 */
export class ChannelRouter {
  private handlers = new Map<string, ChannelHandler>()

  /**
   * Register a channel handler
   */
  register(channel: string, handler: ChannelHandler): void {
    this.handlers.set(channel, handler)
  }

  /**
   * Route a channel message to the appropriate handler
   */
  async route(message: ChannelMessage, context: ChannelContext): Promise<void> {
    const handler = this.handlers.get(message.channel)
    if (!handler) {
      throw new Error(`No handler registered for channel: ${message.channel}`)
    }

    await handler.handle(context, message.action, message.payload)
  }

  /**
   * Get all registered channel names
   */
  getRegisteredChannels(): string[] {
    return Array.from(this.handlers.keys())
  }
}
