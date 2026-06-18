import type { Connection, ConnectionContext } from 'agents'
import { z } from 'zod'

import type { ConnectedUser, ConnectionData } from '../types'

/**
 * Standard app WebSocket message structure
 * - type: string for message routing
 * - data: any payload (flexible per app needs)
 */
export interface AppWebSocketMessage {
  type: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any
}

/**
 * Channel-based WebSocket message structure
 */
export interface ChannelMessage {
  type: 'channel'
  channel: string
  action: string
  payload?: unknown
}

/**
 * Context passed to channel handlers
 */
export interface ChannelContext {
  userId: string
  connectionId: string
  connection: Connection
  // Generic methods for type safety
  broadcast: <T = unknown>(action: string, payload?: T) => Promise<void>
  reply: <T = unknown>(action: string, payload?: T) => void
}

/**
 * Channel handler interface
 */
export interface ChannelHandler {
  handle(context: ChannelContext, action: string, payload?: unknown): Promise<void>
}

/**
 * Result type for agent methods - discriminated union ensuring type safety
 */
export type AgentMethodResult<R> = { ok: true; body: R } | { ok: false; errors: string[] }

/**
 * Validator function type that's bound to specific channel and payload
 */
export type ValidatorFunction<TAction extends string = string> = <T, R = unknown>(params: {
  inputSchema: z.ZodSchema<T>
  agentMethod: (validatedPayload: T) => Promise<AgentMethodResult<R>>
  onSuccess: (validatedPayload: T, result: { ok: true; body: R }) => Promise<void>
  onError?: (
    error: unknown,
    context: { action: TAction; payload: unknown; channel: ChannelContext },
  ) => Promise<void>
  action: TAction
  requiredPermission?: string
}) => Promise<void>

/**
 * Action handler function type - receives pre-bound validator and channel context
 */
export type ActionHandlerFunction<TAction extends string = string> = (
  validate: ValidatorFunction<TAction>,
  channel: ChannelContext,
) => Promise<void>

/**
 * Channel definition for dynamic channel registration
 * nameFn: Function that takes state identifier (e.g., UUID) and returns channel name
 * Handler: Constructor for the channel handler
 */
export interface ChannelDefinition<TAgent = unknown> {
  nameFn: (stateIdentifier: string) => string
  Handler: new (agent: TAgent) => ChannelHandler
}

export interface BaseWebSocketAgentOptions<TAgent = unknown> {
  /**
   * Maximum number of connection attempts for storing attachment data
   * @default 3
   */
  maxAttachmentAttempts?: number

  /**
   * Whether to automatically broadcast connected users updates
   * @default true
   */
  autoBroadcastConnectedUsers?: boolean

  /**
   * Whether to enable connection logging
   * @default process.env.WS_DEBUG === 'true'
   */
  enableConnectionLogging?: boolean

  /**
   * Channel definitions for dynamic registration based on state
   * Each channel will be registered when state identifier is available
   */
  channelDefinitions?: ChannelDefinition<TAgent>[]

  /**
   * Function to extract state identifier (e.g., UUID) from agent state
   * Required if channelDefinitions are provided
   */
  getStateIdentifier?: (state: unknown) => string | null
}

export interface WebSocketConnectionManager {
  /**
   * Store connection data in the connection attachment
   */
  storeConnectionData(connection: Connection, data: ConnectionData): Promise<boolean>

  /**
   * Get connection data from the connection attachment
   */
  getConnectionData(connection: Connection): ConnectionData | null

  /**
   * Get all connected users
   */
  getConnectedUsers(): Promise<ConnectedUser[]>

  /**
   * Broadcast a message to all connected users
   */
  broadcastToAll(message: unknown): Promise<void>

  /**
   * Broadcast a message to a specific user (all their connections)
   */
  broadcastToUser(userId: string, message: unknown): Promise<void>

  /**
   * Update idle status for a connection
   */
  updateIdleStatus(connection: Connection, isIdle: boolean): Promise<void>

  /**
   * Broadcast updated connected users list
   */
  broadcastConnectedUsers(): Promise<void>
}
