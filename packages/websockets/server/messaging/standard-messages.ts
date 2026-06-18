import type { Connection } from 'agents'

import type {
  ActivityPresenceCheckResponse,
  IdleStatusMessage,
  WebSocketMessage,
} from '../../types'
import type { BaseWebSocketAgentHost } from '../base-websocket-agent-host'
import type { ChannelMessage } from '../types'

export async function handleStandardMessageImpl<
  Env extends Cloudflare.Env,
  State,
  PrivateState,
>(
  host: BaseWebSocketAgentHost<Env, State, PrivateState>,
  connection: Connection,
  data: WebSocketMessage,
): Promise<boolean> {
  switch (data.type) {
    case 'activity:idle-status': {
      const idleData = data as IdleStatusMessage
      await host.updateIdleStatus(connection, idleData.data.isIdle)
      return true
    }

    case 'activity:ping':
      // Wake-up ping - no specific action needed, connection is active
      return true

    case 'activity:presence-check-response': {
      const connectionData = host.getConnectionData(connection)
      if (connectionData) {
        // Clear any pending timeout for this connection
        const timeout = host.pendingPresenceChecks.get(
          connectionData.connectionId,
        )
        if (timeout) {
          clearTimeout(timeout)
          host.pendingPresenceChecks.delete(connectionData.connectionId)
        }
        // Update idle status if the client reported a change
        const { isIdle } = (data as ActivityPresenceCheckResponse).data
        if (connectionData.isIdle !== isIdle) {
          await host.updateIdleStatus(connection, isIdle)
        }
      }
      return true
    }

    case 'channel': {
      // Handle channel messages - verify it has channel properties
      if (
        typeof data === 'object' &&
        data !== null &&
        'channel' in data &&
        'action' in data
      ) {
        const channelMessage = data as unknown as ChannelMessage
        await host.handleChannelMessage(connection, channelMessage)
      } else {
        console.error(
          '[BaseWebSocketAgent] Invalid channel message format:',
          data,
        )
      }
      return true
    }

    default:
      return false // Not a standard message
  }
}
