import type { Connection } from 'agents'

import type { ConnectionData } from '../../types'
import type { BaseWebSocketAgentHost } from '../base-websocket-agent-host'

export function safeSendImpl<Env extends Cloudflare.Env, State, PrivateState>(
  host: BaseWebSocketAgentHost<Env, State, PrivateState>,
  connection: Connection | WebSocket,
  message: unknown,
): void {
  // Cast to WebSocketConnection to access readyState
  if (connection.readyState === host.WS_OPEN) {
    try {
      const messageStr =
        typeof message === 'string' ? message : JSON.stringify(message)
      connection.send(messageStr)
    } catch (error) {
      console.warn(
        '[BaseWebSocketAgent] Error sending message on open connection:',
        error,
      )
    }
  } else {
    console.warn(
      `[BaseWebSocketAgent] Not sending message as connection is not open (readyState: ${connection.readyState})`,
    )
  }
}

export async function broadcastToAllImpl<
  Env extends Cloudflare.Env,
  State,
  PrivateState,
>(
  host: BaseWebSocketAgentHost<Env, State, PrivateState>,
  message: unknown,
): Promise<void> {
  const messageStr =
    typeof message === 'string' ? message : JSON.stringify(message)
  const allConnections = host.ctx.getWebSockets()

  // Filter to only open connections
  const openConnections = allConnections.filter((c) => {
    try {
      return c.readyState === host.WS_OPEN
    } catch (error) {
      return false
    }
  })

  openConnections.forEach((connection: Connection | WebSocket) => {
    host.safeSend(connection, messageStr)
  })
}

export async function broadcastToUserImpl<
  Env extends Cloudflare.Env,
  State,
  PrivateState,
>(
  host: BaseWebSocketAgentHost<Env, State, PrivateState>,
  userId: string,
  message: unknown,
): Promise<void> {
  const messageStr =
    typeof message === 'string' ? message : JSON.stringify(message)
  const allConnections = host.ctx.getWebSockets()

  // Filter to only open connections
  const openConnections = allConnections.filter((c) => {
    try {
      return c.readyState === host.WS_OPEN
    } catch (error) {
      console.warn(
        '[BaseWebSocketAgent] Error checking connection readyState for broadcastToUser:',
        error,
      )
      return false
    }
  })

  openConnections.forEach((connection: Connection | WebSocket) => {
    const connectionData = host.getConnectionData(connection)
    if (connectionData?.userId === userId) {
      host.safeSend(connection, messageStr)
    }
  })
}

export async function broadcastToChannelImpl<
  Env extends Cloudflare.Env,
  State,
  PrivateState,
  T = unknown,
>(
  host: BaseWebSocketAgentHost<Env, State, PrivateState>,
  channelName: string,
  action: string,
  payload?: T,
): Promise<void> {
  const allConnections = host.ctx.getWebSockets()
  const message = JSON.stringify({
    type: 'channel',
    channel: channelName,
    action,
    payload,
  })

  // Filter to only open connections
  const openConnections = allConnections.filter((c) => {
    try {
      return c.readyState === host.WS_OPEN
    } catch (error) {
      return false
    }
  })

  let broadcastCount = 0
  let deniedCount = 0

  for (const connection of openConnections) {
    // Use the hook to check permissions for this specific connection
    if (host.canAccessChannel(connection, channelName)) {
      host.safeSend(connection, message)
      broadcastCount++
    } else {
      deniedCount++
    }
  }

  // Optional: Log denied attempts if debugging is enabled
  if (host.wsOptions.enableConnectionLogging && deniedCount > 0) {
    console.log(
      `[BaseWebSocketAgent] Broadcast to ${channelName}: sent to ${broadcastCount}, denied ${deniedCount}`,
    )
  }
}

export function canAccessChannelImpl<
  Env extends Cloudflare.Env,
  State,
  PrivateState,
>(
  _host: BaseWebSocketAgentHost<Env, State, PrivateState>,
  _connection: Connection | WebSocket,
  _channelName: string,
): boolean {
  // Default to allowing access. Subclasses should override this to implement RBAC.
  return true
}
