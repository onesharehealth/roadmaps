import type { Connection } from 'agents'

import type { ConnectionData } from '../../types'
import type { BaseWebSocketAgentHost } from '../base-websocket-agent-host'

export async function storeConnectionDataImpl<
  Env extends Cloudflare.Env,
  State,
  PrivateState,
>(
  host: BaseWebSocketAgentHost<Env, State, PrivateState>,
  connection: Connection,
  data: ConnectionData,
): Promise<boolean> {
  for (
    let attempt = 0;
    attempt < host.wsOptions.maxAttachmentAttempts;
    attempt++
  ) {
    try {
      connection.setState(data)

      // Verify it was stored
      const verification = connection.state as ConnectionData
      if (verification?.userId === data.userId) {
        return true
      } else if (attempt < host.wsOptions.maxAttachmentAttempts - 1) {
        console.warn(
          `[BaseWebSocketAgent] Attachment verification failed for ${data.userId}, retrying...`,
        )
      }
    } catch (error) {
      if (attempt < host.wsOptions.maxAttachmentAttempts - 1) {
        console.warn(
          `Attachment attempt ${attempt + 1} failed for ${
            data.userId
          }, retrying...`,
        )
      } else {
        console.warn(
          `All attachment attempts failed for ${data.userId}:`,
          error,
        )
      }
    }
  }
  return false
}

export function getConnectionDataImpl<
  Env extends Cloudflare.Env,
  State,
  PrivateState,
>(
  _host: BaseWebSocketAgentHost<Env, State, PrivateState>,
  connection: Connection | WebSocket,
): ConnectionData | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let rawData: any

    // Check if it's a PartyServer Connection (has .state getter)
    if ('state' in connection) {
      rawData = (connection as Connection).state
    }
    // Fallback for raw Cloudflare WebSockets (e.g. from getWebSockets() after wake-up)
    else if (
      'deserializeAttachment' in connection &&
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      typeof (connection as any).deserializeAttachment === 'function'
    ) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      rawData = (connection as any).deserializeAttachment()
    }

    // Handle both direct format and wrapped format (for backward compatibility)
    let userData = rawData
    if (rawData?.__user) {
      // Wrapped format (what we're seeing in logs)
      userData = rawData.__user
    }

    if (userData?.userId) {
      return {
        userId: userData.userId,
        connectionId: userData.connectionId || crypto.randomUUID(), // Fallback for old connections
        connectedAt: userData.connectedAt || Date.now(),
        isIdle: userData.isIdle ?? false,
        userAgent: userData.userAgent,
        clientInstanceId: userData.clientInstanceId,
        lastActivityTimestamp: userData.lastActivityTimestamp || Date.now(), // Provide default
        clientIdleTimeout: userData.clientIdleTimeout || 300000, // Provide default (5 minutes)
      }
    }
  } catch (error) {
    console.warn('[BaseWebSocketAgent] Error deserializing attachment:', error)
  }
  return null
}
