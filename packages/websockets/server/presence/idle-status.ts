import type { Connection } from 'agents'

import type { ConnectionData } from '../../types'
import type { BaseWebSocketAgentHost } from '../base-websocket-agent-host'

export async function updateIdleStatusImpl<
  Env extends Cloudflare.Env,
  State,
  PrivateState,
>(
  host: BaseWebSocketAgentHost<Env, State, PrivateState>,
  connection: Connection,
  isIdle: boolean,
): Promise<void> {
  try {
    const connectionData = host.getConnectionData(connection)
    if (connectionData) {
      // Check if this is a PartyServer Connection with setState support
      // After hibernation wake-up, getWebSockets() may return raw Cloudflare WebSockets
      if (
        'setState' in connection &&
        typeof (connection as Connection).setState === 'function'
      ) {
        // Update only this specific connection's idle status
        ;(connection as Connection).setState({
          ...connectionData,
          isIdle,
        })
      } else {
        // Raw WebSocket objects don't support setState, skip this update
        if (host.wsOptions.enableConnectionLogging) {
          console.log(
            `[BaseWebSocketAgent] Skipping setState update for raw WebSocket (connection may be from hibernation recovery)`,
          )
        }
      }

      // Broadcast updated connected users list if enabled (regardless of setState success)
      if (host.wsOptions.autoBroadcastConnectedUsers) {
        await host.broadcastConnectedUsers()
      }
    }
  } catch (error) {
    console.error('[BaseWebSocketAgent] Error updating idle status:', error)
  }
}
