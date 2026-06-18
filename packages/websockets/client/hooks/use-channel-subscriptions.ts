import { useCallback, useRef } from 'react'

import type {
  ChannelSubscription,
  ClientChannelMessage,
  WebSocketAgentReturn,
} from '../types'

export function useChannelSubscriptions(
  connection: WebSocketAgentReturn['connection'],
  isConnected: boolean,
) {
  // Channel state - use Ref to avoid recreating handleMessage and re-binding listeners
  // Store a Set of subscriptions for each channel to allow multiple listeners per channel
  const channelSubscriptionsRef = useRef<Map<string, Set<ChannelSubscription>>>(
    new Map(),
  )

  const subscribeToChannel = useCallback(
    (channel: string, handlers: Record<string, (payload: unknown) => void>) => {
      const subscriptions =
        channelSubscriptionsRef.current.get(channel) || new Set()
      const subscription = { channel, handlers }
      subscriptions.add(subscription)
      channelSubscriptionsRef.current.set(channel, subscriptions)

      // Return unsubscribe function for this specific subscription
      return () => {
        const currentSubs = channelSubscriptionsRef.current.get(channel)
        if (currentSubs) {
          currentSubs.delete(subscription)
          if (currentSubs.size === 0) {
            channelSubscriptionsRef.current.delete(channel)
          }
        }
      }
    },
    [],
  )

  const publishToChannel = useCallback(
    (channel: string, action: string, payload?: unknown) => {
      if (connection && isConnected) {
        const message: ClientChannelMessage = {
          type: 'channel',
          channel,
          action,
          payload,
        }
        connection.send(JSON.stringify(message))
      } else {
        console.warn(
          `[useWebSocketAgent] Cannot publish to channel ${channel} - not connected`,
        )
      }
    },
    [connection, isConnected],
  )

  return {
    channelSubscriptionsRef,
    subscribeToChannel,
    publishToChannel,
  }
}
