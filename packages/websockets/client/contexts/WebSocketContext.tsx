import React, { createContext, useContext, useState } from 'react'

import { useWebSocketAgent } from '../hooks/useWebSocketAgent'
import type { WebSocketContextValue, WebSocketProviderProps } from '../types'

const WebSocketContext = createContext<WebSocketContextValue | null>(null)

/**
 * WebSocket Provider that combines connection management with state management
 *
 * This provider offers:
 * - All useWebSocketAgent functionality
 * - Additional state management for app-specific data
 * - Context-based access throughout the component tree
 *
 * @example
 * ```tsx
 * function MyApp() {
 *   return (
 *     <WebSocketProvider
 *       agent="my-agent"
 *       name="instance-123"
 *       idleTimeout={30000}
 *       onMessage={handleMessage}
 *     >
 *       <MyComponent />
 *     </WebSocketProvider>
 *   )
 * }
 *
 * function MyComponent() {
 *   const { connection, isConnected, state, setState } = useWebSocket()
 *   // Use the websocket connection and state...
 * }
 * ```
 */
export function WebSocketProvider<T = unknown>({
  children,
  agent,
  name,
  idleTimeout,
  idleEvents,
  idleThrottleMs,
  enableIdleTracking,
  enableConnectedUsersTracking,
  onMessage,
  initialState,
}: WebSocketProviderProps<T>) {
  const [state, setState] = useState<T>(initialState as T)

  const websocketAgent = useWebSocketAgent({
    agent,
    name,
    idleTimeout,
    idleEvents,
    idleThrottleMs,
    enableIdleTracking,
    enableConnectedUsersTracking,
    onMessage,
  })

  const contextValue: WebSocketContextValue<T> = {
    ...websocketAgent,
    state,
    setState,
  }

  return (
    <WebSocketContext.Provider value={contextValue as WebSocketContextValue}>
      {children}
    </WebSocketContext.Provider>
  )
}

/**
 * Hook to access the WebSocket context
 *
 * @throws Error if used outside of WebSocketProvider
 */
export function useWebSocket<T = unknown>(): WebSocketContextValue<T> {
  const context = useContext(WebSocketContext)
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider')
  }
  return context as WebSocketContextValue<T>
}

/**
 * Hook to create a typed WebSocket context hook
 *
 * @example
 * ```tsx
 * interface MyAppState {
 *   votes: Vote[]
 *   users: User[]
 * }
 *
 * const useMyAppWebSocket = createTypedWebSocketHook<MyAppState>()
 *
 * function MyComponent() {
 *   const { state, setState, isConnected } = useMyAppWebSocket()
 *   // state is typed as MyAppState
 * }
 * ```
 */
export function createTypedWebSocketHook<T>() {
  return (): WebSocketContextValue<T> => {
    return useWebSocket<T>()
  }
}
