import type { MutableRefObject } from 'react'

import type { ConnectedUser } from '../../types'
import type {
  ChannelSubscription,
  ClientChannelMessage,
  WebSocketAgentReturn,
} from '../types'

export function handleStandardWebSocketMessage({
  data,
  connection,
  isIdleRef,
  channelSubscriptionsRef,
  enableConnectedUsersTracking,
  setConnectedUsers,
}: {
  data: { type: string; data?: { connectedUsers?: ConnectedUser[] } }
  connection: WebSocketAgentReturn['connection']
  isIdleRef: MutableRefObject<boolean>
  channelSubscriptionsRef: MutableRefObject<
    Map<string, Set<ChannelSubscription>>
  >
  enableConnectedUsersTracking: boolean
  setConnectedUsers: (users: ConnectedUser[]) => void
}): void {
  // Handle standard websocket messages (runs by default unless prevented)
  switch (data.type) {
    case 'initial-state':
      // Initial state from server when connecting
      if (data.data?.connectedUsers && enableConnectedUsersTracking) {
        setConnectedUsers(data.data.connectedUsers)
      }
      break

    case 'connected-users:updated':
      // Connected users update from server
      if (data.data?.connectedUsers && enableConnectedUsersTracking) {
        setConnectedUsers(data.data.connectedUsers)
      }
      break

    case 'activity:presence-check-request': {
      // Server asking for presence check response
      // Only respond if the connection is actually open
      if (connection && connection.readyState === WebSocket.OPEN) {
        connection.send(
          JSON.stringify({
            type: 'activity:presence-check-response',
            data: { isIdle: isIdleRef.current },
          }),
        )
      }
      break
    }

    case 'channel': {
      // Handle channel messages
      const channelMessage = data as ClientChannelMessage

      const subscriptions = channelSubscriptionsRef.current.get(
        channelMessage.channel,
      )
      if (subscriptions && subscriptions.size > 0) {
        // Dispatch to all subscribers
        subscriptions.forEach((subscription) => {
          const handler = subscription.handlers[channelMessage.action]
          if (handler) {
            try {
              handler(channelMessage.payload)
            } catch (error) {
              console.error(
                `[useWebSocketAgent] Error in channel handler for ${channelMessage.channel}/${channelMessage.action}:`,
                error,
              )
            }
          }
        })
      } else {
        // Debug log for troubleshooting missing subscriptions
        console.warn(
          `[useWebSocketAgent] Received message for unsubscribed channel: ${
            channelMessage.channel
          }. Available channels: ${Array.from(
            channelSubscriptionsRef.current.keys(),
          ).join(', ')}`,
        )
      }
      break
    }

    default:
      // Let the message fall through for app-specific handling
      // If onMessage didn't handle it and it's not a standard message,
      // we'll let it pass (this prevents breaking existing implementations)
      break
  }
}
