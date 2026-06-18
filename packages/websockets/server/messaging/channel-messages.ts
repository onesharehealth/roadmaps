import type { Connection } from 'agents'

import type { BaseWebSocketAgentHost } from '../base-websocket-agent-host'
import type { ChannelContext, ChannelMessage } from '../types'

export async function handleChannelMessageImpl<
  Env extends Cloudflare.Env,
  State,
  PrivateState,
>(
  host: BaseWebSocketAgentHost<Env, State, PrivateState>,
  connection: Connection,
  message: ChannelMessage,
): Promise<void> {
  const connectionData = host.getConnectionData(connection)
  if (!connectionData) {
    console.error(
      '[BaseWebSocketAgent] No connection data found for channel message',
    )
    host.safeSend(
      connection,
      JSON.stringify({
        type: 'channel',
        channel: message.channel,
        action: 'error',
        payload: { message: 'Connection not authenticated' },
      }),
    )
    return
  }

  // Create channel context
  const context: ChannelContext = {
    userId: connectionData.userId,
    connectionId: connection.toString() || crypto.randomUUID(),
    connection,
    broadcast: async <T = unknown>(action: string, payload?: T) => {
      // Broadcast to all connections that have access to this channel
      await host.broadcastToChannel(message.channel, action, payload)
    },
    reply: <T = unknown>(action: string, payload?: T) => {
      // Use the safeSend method
      host.safeSend(
        connection,
        JSON.stringify({
          type: 'channel',
          channel: message.channel,
          action,
          payload,
        }),
      )
    },
  }

  try {
    await host.channelRouter.route(message, context)
  } catch (error) {
    console.error('[BaseWebSocketAgent] Error routing channel message:', error)
    context.reply('error', {
      message: error instanceof Error ? error.message : 'Unknown error',
      originalAction: message.action,
    })
  }
}
