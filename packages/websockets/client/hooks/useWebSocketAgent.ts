import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAgent } from 'agents/react'

import type { ConnectedUser } from '../../types'
import type { WebSocketAgentOptions, WebSocketAgentReturn } from '../types'
import { handleStandardWebSocketMessage } from './handle-standard-message'
import { useChannelSubscriptions } from './use-channel-subscriptions'
import { useConnectionStatus } from './use-connection-status'
import { useIdleSync } from './use-idle-sync'
import { useIdle } from './useIdleTracking'

/**
 * Custom hook for managing WebSocket connections to agents with built-in features:
 * - Connection management
 * - Idle tracking and server communication
 * - Connected users tracking
 * - Automatic message handling for standard messages
 */
export function useWebSocketAgent({
  agent,
  name,
  idleTimeout = 600000, // 10 minutes default
  idleEvents,
  idleThrottleMs,
  enableIdleTracking = true,
  externalIsIdle,
  enableConnectedUsersTracking = true,
  onOpen,
  onClose,
  onError,
  onMessage,
  metadata,
  query: originalQuery, // Rename incoming query to avoid conflict
}: WebSocketAgentOptions): WebSocketAgentReturn {
  // Connection state
  const [isConnected, setIsConnected] = useState(false)
  const [isAttemptingReconnect, setIsAttemptingReconnect] = useState(false)
  const [connectedUsers, setConnectedUsers] = useState<ConnectedUser[]>([])

  // Idle tracking - use external idle state if provided, otherwise use internal tracking
  const internalIsIdle = useIdle(
    enableIdleTracking && externalIsIdle === undefined
      ? idleTimeout
      : Number.MAX_SAFE_INTEGER,
    {
      events: idleEvents,
      throttleMs: idleThrottleMs,
    },
  )
  const isIdle = externalIsIdle !== undefined ? externalIsIdle : internalIsIdle
  const [wasIdle, setWasIdle] = useState(false)

  // Memoized connection callbacks
  const onOpenCallback = useCallback(() => {
    setIsConnected(true)
    setIsAttemptingReconnect(false)
    onOpen?.()
  }, [onOpen])

  const onCloseCallback = useCallback(() => {
    setIsConnected(false)
    setIsAttemptingReconnect(true) // Start reconnecting on close
    onClose?.()
  }, [onClose])

  const onErrorCallback = useCallback(
    (error: unknown) => {
      console.error('[useWebSocketAgent] WebSocket error:', error)
      setIsConnected(false)
      setIsAttemptingReconnect(true) // Attempt reconnect on error
      onError?.(error)
    },
    [onError],
  )

  // Memoize the query object to prevent unnecessary reconnections
  // usePartySocket may reconnect if it detects the query object has changed
  const query = useMemo(
    () => ({
      ...originalQuery,
      'x-client-idle-timeout': idleTimeout.toString(),
      ...metadata,
    }),
    // Use JSON.stringify for objects to ensure stable comparison
    [JSON.stringify(originalQuery), idleTimeout, JSON.stringify(metadata)],
  )

  // Create the agent connection
  const connection = useAgent({
    agent,
    name,
    onOpen: onOpenCallback,
    onClose: onCloseCallback,
    onError: onErrorCallback,
    query,
  }) as WebSocketAgentReturn['connection']
  /**
   * LLM rationale for the casting:
   *
   * The error occurred because useAgent called without generic parameters returns an UntypedAgentMethodCall (essentially any), while WebSocketAgentReturn's connection property (defined via ReturnType<typeof useAgent>) infers the type using useAgent's default generic parameter (which is { readonly state: unknown }), resulting in a stricter AgentMethodCall.
   * I fixed it by casting the useAgent result to WebSocketAgentReturn['connection']. This tells TypeScript that the untyped connection is compatible with the interface's expectation, resolving the assignment error.
   * No, you do not need to update packages/websockets/client/types.ts. It is better to keep the type definition there as-is (referencing useAgent) and handle the implementation detail in the hook via casting. This preserves the type signature for consumers of the hook.
   */

  useConnectionStatus(connection, {
    isConnected,
    setIsConnected,
    isAttemptingReconnect,
    setIsAttemptingReconnect,
  })

  const { isIdleRef } = useIdleSync({
    connection,
    isConnected,
    enableIdleTracking,
    isIdle,
    wasIdle,
    setWasIdle,
  })

  const { channelSubscriptionsRef, subscribeToChannel, publishToChannel } =
    useChannelSubscriptions(connection, isConnected)

  // Handle incoming messages
  const handleMessage = useCallback(
    (event: MessageEvent) => {
      try {
        // Allow custom message handler to process first
        const shouldPreventDefaultHandling = onMessage?.(event)

        // If custom handler explicitly returns true, skip default handling
        if (shouldPreventDefaultHandling === true) {
          return
        }

        const data = JSON.parse(event.data)

        handleStandardWebSocketMessage({
          data,
          connection,
          isIdleRef,
          channelSubscriptionsRef,
          enableConnectedUsersTracking,
          setConnectedUsers,
        })
      } catch (error) {
        console.error('[useWebSocketAgent] Error parsing message:', error)
      }
    },
    [
      onMessage,
      enableConnectedUsersTracking,
      connection,
      isIdleRef,
      channelSubscriptionsRef,
    ],
  )

  // Set up message listener
  useEffect(() => {
    if (!connection) return

    connection.addEventListener('message', handleMessage)
    return () => {
      connection.removeEventListener('message', handleMessage)
    }
  }, [connection, handleMessage])

  // Utility functions
  const send = useCallback(
    (message: unknown) => {
      if (connection && isConnected) {
        const messageStr =
          typeof message === 'string' ? message : JSON.stringify(message)
        connection.send(messageStr)
      }
    },
    [connection, isConnected],
  )

  const refreshConnectedUsers = useCallback(() => {
    if (connection && isConnected) {
      connection.send(JSON.stringify({ type: 'connected-users:get' }))
    }
  }, [connection, isConnected])

  // Auto-refresh connected users when connected
  useEffect(() => {
    if (isConnected && enableConnectedUsersTracking) {
      refreshConnectedUsers()
    }
  }, [isConnected, enableConnectedUsersTracking, refreshConnectedUsers])

  return {
    connection,
    isConnected,
    isAttemptingReconnect,
    connectedUsers,
    isIdle,
    send,
    refreshConnectedUsers,
    subscribeToChannel,
    publishToChannel,
  }
}
