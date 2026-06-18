import type { ReactNode } from 'react'

import type { ConnectedUser } from '../types'
import type { IdleEvent } from './hooks/useIdleTracking'

/**
 * Channel subscription configuration
 */
export interface ChannelSubscription {
  channel: string
  handlers: Record<string, (payload: unknown) => void>
}

/**
 * Channel message for client-server communication
 */
export interface ClientChannelMessage {
  type: 'channel'
  channel: string
  action: string
  payload?: unknown
}

export interface WebSocketAgentOptions {
  /**
   * The agent name to connect to
   */
  agent: string

  /**
   * The agent instance name/identifier
   */
  name: string

  /**
   * Optional metadata to send with the connection headers.
   * Keys will be prefixed with 'x-metadata-' in the headers.
   */
  metadata?: Record<string, string | undefined>

  /**
   * Idle timeout in milliseconds
   * @default 600000 (10 minutes)
   */
  idleTimeout?: number

  /**
   * Events that should reset the idle timer
   * Use fewer events (e.g., ['mousedown', 'keydown']) to reduce Durable Object wake-ups from hibernation
   * @default ['mousemove', 'mousedown', 'resize', 'keydown', 'touchstart', 'wheel']
   */
  idleEvents?: IdleEvent[]

  /**
   * Throttle delay for idle event handlers in milliseconds
   * @default 500
   */
  idleThrottleMs?: number

  /**
   * Enable idle tracking and communication with server
   * @default true
   */
  enableIdleTracking?: boolean

  /**
   * External idle state to use instead of internal tracking
   * When provided, this overrides the internal idle detection
   */
  externalIsIdle?: boolean

  /**
   * Enable automatic connected users tracking
   * @default true
   */
  enableConnectedUsersTracking?: boolean

  /**
   * Callback when websocket connection opens
   */
  onOpen?: () => void

  /**
   * Callback when websocket connection closes
   */
  onClose?: () => void

  /**
   * Callback when websocket connection encounters an error
   */
  onError?: (error: unknown) => void

  /**
   * Callback for handling websocket messages
   * Return true to prevent default processing, false/undefined to allow both custom and default handling
   */
  onMessage?: (event: MessageEvent) => boolean | void

  query?: Record<string, string>
}

export interface WebSocketAgentReturn {
  /**
   * The WebSocket connection object
   */
  connection: ReturnType<typeof import('agents/react').useAgent>

  /**
   * Whether the connection is currently active
   */
  isConnected: boolean

  /**
   * List of currently connected users
   */
  connectedUsers: ConnectedUser[]

  /**
   * Whether the current user is idle
   */
  isIdle: boolean

  /**
   * Send a JSON message to the server
   */
  send: (message: unknown) => void

  /**
   * Manually refresh connected users list
   */
  refreshConnectedUsers: () => void

  /**
   * Subscribe to a channel with action handlers
   * @returns An unsubscribe function
   */
  subscribeToChannel: (
    channel: string,
    handlers: Record<string, (payload: unknown) => void>,
  ) => () => void

  /**
   * Publish a message to a channel
   */
  publishToChannel: (channel: string, action: string, payload?: unknown) => void
  /**
   * Whether the connection is currently attempting to reconnect
   */
  isAttemptingReconnect: boolean
}

export interface WebSocketContextValue<T = unknown>
  extends WebSocketAgentReturn {
  /**
   * Additional state managed by the context
   */
  state: T

  /**
   * Update the context state
   */
  setState: React.Dispatch<React.SetStateAction<T>>
}

export interface WebSocketProviderProps<T = unknown> {
  children: ReactNode
  agent: string
  name: string
  idleTimeout?: number
  idleEvents?: IdleEvent[]
  idleThrottleMs?: number
  enableIdleTracking?: boolean
  enableConnectedUsersTracking?: boolean
  onMessage?: (event: MessageEvent) => boolean | void
  initialState?: T
}
