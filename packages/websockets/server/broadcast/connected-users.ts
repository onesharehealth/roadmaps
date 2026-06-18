import type { Connection } from 'agents'

import type { ConnectedUser } from '../../types'
import type { BaseWebSocketAgentHost } from '../base-websocket-agent-host'

export async function getConnectedUsersImpl<
  Env extends Cloudflare.Env,
  State,
  PrivateState,
>(
  host: BaseWebSocketAgentHost<Env, State, PrivateState>,
): Promise<ConnectedUser[]> {
  // Get all WebSocket connections
  const allConnections = host.ctx.getWebSockets()

  // Filter to only include connections that are:
  // 1. In OPEN state (readyState === 1)
  // 2. Tracked in our activeConnectionIds Set (not stale)
  const activeConnections = allConnections.filter((connection) => {
    try {
      // Check if connection is in OPEN state (readyState === 1)
      if (connection.readyState !== host.WS_OPEN) {
        return false // WebSocket not OPEN
      }

      // Also check if this connection is in our active tracking Set
      const connectionData = host.getConnectionData(connection)
      if (!connectionData?.connectionId) {
        return false // No connection data
      }

      return host.activeConnectionIds.has(connectionData.connectionId)
    } catch (error) {
      // If we can't check readyState, assume it's closed
      if (host.wsOptions.enableConnectionLogging) {
        console.warn(
          `[BaseWebSocketAgent] Error checking connection readyState:`,
          error,
        )
      }
      return false
    }
  })

  // Build connected users list - deduplicate by clientInstanceId only (one connection per instance)
  // clientInstanceId is now GUARANTEED to be present (see onConnect validation)
  const deduped = new Map<string, ConnectedUser>()

  activeConnections.forEach((connection: Connection | WebSocket) => {
    const connectionData = host.getConnectionData(connection)
    if (!connectionData) return // Skip if no connection data

    // clientInstanceId is the PRIMARY deduplication key
    const key = connectionData.clientInstanceId

    if (!key) {
      // This shouldn't happen as clientInstanceId is required in onConnect
      if (host.wsOptions.enableConnectionLogging) {
        console.warn(
          '[BaseWebSocketAgent] Connection data missing clientInstanceId - this should not happen',
        )
      }
      return
    }

    const candidate: ConnectedUser = {
      username: connectionData.userId,
      connectionId: connectionData.connectionId,
      connectedAt: connectionData.connectedAt,
      isIdle: connectionData.isIdle ?? false,
      userAgent: connectionData.userAgent,
      clientInstanceId: connectionData.clientInstanceId,
    }

    // If we already have an entry for this clientInstanceId, keep the newer one
    const existing = deduped.get(key)
    if (!existing || candidate.connectedAt >= existing.connectedAt) {
      deduped.set(key, candidate)
    }
  })

  return Array.from(deduped.values())
}

export async function broadcastConnectedUsersImpl<
  Env extends Cloudflare.Env,
  State,
  PrivateState,
>(host: BaseWebSocketAgentHost<Env, State, PrivateState>): Promise<void> {
  if (host.broadcastDebounceTimer) {
    return
  }

  host.broadcastDebounceTimer = setTimeout(async () => {
    host.broadcastDebounceTimer = null
    try {
      const connectedUsers = await host.getConnectedUsers()
      await host.broadcastToAll({
        type: 'connected-users:updated',
        data: { connectedUsers },
      })
    } catch (error) {
      console.error(
        '[BaseWebSocketAgent] Error broadcasting connected users:',
        error,
      )
    }
  }, host.BROADCAST_DEBOUNCE_MS)
}
