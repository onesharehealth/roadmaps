import type { Connection } from 'agents'
import type { WSMessage } from 'agents'

import type { BaseWebSocketAgentHost } from '../base-websocket-agent-host'
import type { AppWebSocketMessage } from '../types'

export async function onMessageImpl<
  Env extends Cloudflare.Env,
  State,
  PrivateState,
>(
  host: BaseWebSocketAgentHost<Env, State, PrivateState>,
  connection: Connection,
  message: WSMessage,
): Promise<void> {
  try {
    if (message instanceof ArrayBuffer) {
      await host.handleBinaryMessage?.(connection, message)
      return
    }

    // Handle JSON messages
    const data = typeof message === 'string' ? JSON.parse(message) : null
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid message format')
    }

    // Update last activity timestamp for this connection
    const connectionData = host.getConnectionData(connection)
    if (connectionData) {
      connectionData.lastActivityTimestamp = Date.now()
      await host.storeConnectionData(connection, connectionData)
    }

    // Handle standard websocket messages
    if (await host.handleStandardMessage(connection, data)) {
      return // Message was handled by base class
    }

    // Delegate to app-specific message handler
    await host.handleAppMessage(connection, data as AppWebSocketMessage)
  } catch (error) {
    console.error('[BaseWebSocketAgent] Error processing message:', error)
    host.safeSend(
      connection,
      JSON.stringify({
        type: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    )
  }
}
