import type { ChannelContext, ChannelHandler } from '../types'

/**
 * Simple test channel handler for basic ping/pong functionality
 */
export class TestChannelHandler implements ChannelHandler {
  async handle(
    context: ChannelContext,
    action: string,
    payload?: unknown,
  ): Promise<void> {
    console.log(
      `[TestChannelHandler] Received action: ${action}, payload:`,
      payload,
    )

    switch (action) {
      case 'ping':
        // Reply with pong
        context.reply('pong', {
          message: 'Hello from test channel!',
          timestamp: Date.now(),
          originalPayload: payload,
        })
        break

      case 'broadcast': {
        // Broadcast to all subscribers
        const broadcastPayload = payload as
          | { message?: string }
          | null
          | undefined
        await context.broadcast('test-broadcast', {
          message: broadcastPayload?.message || 'Test broadcast message',
          timestamp: Date.now(),
          from: context.userId,
        })
        break
      }

      default:
        context.reply('error', {
          message: `Unknown action: ${action}`,
          availableActions: ['ping', 'broadcast'],
        })
    }
  }
}
