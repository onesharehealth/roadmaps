import type { Connection } from 'agents'

import type { BaseWebSocketAgentHost } from '../base-websocket-agent-host'

export async function onCloseImpl<
  Env extends Cloudflare.Env,
  State,
  PrivateState,
>(
  host: BaseWebSocketAgentHost<Env, State, PrivateState>,
  connection: Connection,
  _code: number,
  _reason: string,
  _wasClean: boolean,
): Promise<void> {
  // Get connection data before cleanup
  const connectionData = host.getConnectionData(connection)
  const userId = connectionData?.userId || 'unknown'
  const connectionId = connectionData?.connectionId

  // Remove from active connections tracking
  if (connectionId) {
    host.activeConnectionIds.delete(connectionId)
    await host.saveActiveConnectionsToStorage()
  }

  // Broadcast updated connected users list if enabled
  if (host.wsOptions.autoBroadcastConnectedUsers) {
    await host.broadcastConnectedUsers()
  }

  // Schedule an alarm to aggressively check all remaining connections
  // This catches any other zombie connections that might exist
  if (host.activeConnectionIds.size > 0) {
    await host.ctx.storage.setAlarm(Date.now() + host.ALARM_INTERVAL_MS)
  }
}
