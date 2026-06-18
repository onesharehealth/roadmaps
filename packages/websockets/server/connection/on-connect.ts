import type { Connection, ConnectionContext } from 'agents'

import type { ConnectionData } from '../../types'
import type { BaseWebSocketAgentHost } from '../base-websocket-agent-host'

export async function onConnectImpl<
  Env extends Cloudflare.Env,
  State,
  PrivateState,
>(
  host: BaseWebSocketAgentHost<Env, State, PrivateState>,
  connection: Connection,
  ctx: ConnectionContext,
): Promise<void> {
  // Extract user information from headers
  const userId = ctx.request.headers.get('x-user-id')
  const userAgent = ctx.request.headers.get('user-agent')
  const clientInstanceId = ctx.request.headers.get(
    'x-metadata-client-instance-id',
  )
  const clientIdleTimeoutHeader = ctx.request.headers.get(
    'x-client-idle-timeout',
  )
  const clientIdleTimeout = clientIdleTimeoutHeader
    ? parseInt(clientIdleTimeoutHeader, 10)
    : host.DEFAULT_CLIENT_IDLE_TIMEOUT

  if (!userId || userId.trim() === '') {
    console.error(
      '[BaseWebSocketAgent] No user ID found in connection headers - closing connection',
    )
    connection.close(1008, 'Authentication required')
    return
  }

  // Require clientInstanceId - it MUST come from the client
  if (!clientInstanceId || clientInstanceId.trim() === '') {
    console.error(
      `[BaseWebSocketAgent] No clientInstanceId provided from client for user ${userId} - closing connection`,
    )
    connection.close(1008, 'clientInstanceId required')
    return
  }

  // Generate a stable connection ID
  let connectionId: string
  try {
    const connStr = connection.toString()
    // Use connection.toString() if it gives us a good identifier
    if (
      connStr &&
      connStr !== '[object WebSocket]' &&
      connStr !== '[object Object]' &&
      connStr.length < 100
    ) {
      connectionId = connStr
    } else {
      // Generate a unique ID that will remain stable for this connection
      connectionId = crypto.randomUUID()
    }
  } catch (error) {
    connectionId = crypto.randomUUID()
  }

  // Store connection data with retry logic
  const connectionData: ConnectionData = {
    userId,
    connectionId,
    connectedAt: Date.now(),
    isIdle: false,
    userAgent: userAgent || 'Unknown',
    clientInstanceId, // Always present now (required above)
    lastActivityTimestamp: Date.now(),
    clientIdleTimeout,
  }

  const stored = await host.storeConnectionData(connection, connectionData)
  if (!stored) {
    console.error(
      `[BaseWebSocketAgent] Failed to store connection data for user ${userId}, clientInstanceId: ${clientInstanceId} - closing connection`,
    )
    connection.close(1011, 'Internal server error')
    return
  }

  // Track this connection as active
  host.activeConnectionIds.add(connectionId)
  await host.saveActiveConnectionsToStorage()

  // Proactively close duplicate connections for same clientInstanceId (keep newest/current)
  await host.closeDuplicateConnectionsByInstance(
    userId,
    clientInstanceId,
    connection,
  )

  // NOTE: Removed aggressive connection check here as it was causing a reconnection loop.
  // The duplicate connection cleanup above handles the same clientInstanceId case.
  // Stale connections will be cleaned up by the regular inactivity check or alarms.

  // Broadcast updated connected users list if enabled
  if (host.wsOptions.autoBroadcastConnectedUsers) {
    await host.broadcastConnectedUsers()
  }
}
